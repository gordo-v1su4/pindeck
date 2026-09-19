import { v } from "convex/values";
import { httpAction, query, mutation, internalMutation, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { preferredImageUrlForSampling } from "../colorExtractionUrls";
import {
  deleteImageRecord,
  internalApi,
  isDiscordLineage,
  isModeratedImportSource,
  mapImageForDisplay,
  parseUserIdFromBody,
  readBearerToken,
  resolveLineageRoot,
  shouldQueueAnalysis,
  triggerOrchestrationEnabled,
} from "./shared";

export const internalListDiscordQueue = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const takeLimit = Math.min(Math.max(args.limit ?? 5, 1), 25);
    const scanLimit = Math.min(Math.max(takeLimit * 6, 40), 200);
    const pending = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .take(scanLimit);

    const filtered = [];
    for (const image of pending) {
      if (!(await isDiscordLineage(ctx, image))) continue;
      const root = await resolveLineageRoot(ctx, image);
      filtered.push({
        ...mapImageForDisplay(image),
        lineageRootImageId: root?._id,
        lineageRootTitle: root?.title,
      });
    }
    return filtered.slice(0, takeLimit);
  },
});

export const internalModerateDiscordImage = internalMutation({
  args: {
    userId: v.id("users"),
    imageId: v.id("images"),
    action: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("generate"),
    ),
    variationCount: v.optional(v.number()),
    modificationMode: v.optional(v.string()),
    variationDetail: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    message: v.string(),
    status: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");
    if (image.uploadedBy !== args.userId) {
      throw new Error("Image does not belong to provided userId");
    }

    if (args.action === "approve") {
      if (image.status === "active") {
        return {
          ok: true,
          message: "Image already active.",
          status: image.status,
          aiStatus: image.aiStatus,
        };
      }

      const isModeratedSource = isModeratedImportSource(image.sourceType);
      const shouldRunAnalysis = shouldQueueAnalysis(image);
      const nextStatus = isModeratedSource ? "draft" : "active";
      await ctx.db.patch(args.imageId, {
        status: nextStatus,
        aiStatus: shouldRunAnalysis ? "processing" : image.aiStatus,
      });

      const triggerEnabled = triggerOrchestrationEnabled();
      if ((!image.colors || image.colors.length === 0) && !triggerEnabled) {
        await ctx.scheduler.runAfter(
          0,
          internalApi.colorExtraction.internalExtractAndStoreColors,
          {
            imageId: image._id,
            imageUrl: preferredImageUrlForSampling(image) ?? image.imageUrl,
          },
        );
      }

      if (shouldRunAnalysis) {
        if (triggerEnabled) {
          await ctx.scheduler.runAfter(
            0,
            internalApi.triggerDispatch.dispatchImageMetadataRefresh,
            {
              imageId: image._id,
              userId: args.userId,
              forcePalette: !image.colors?.length,
              runMetadata: true,
            },
          );
        } else {
          await ctx.scheduler.runAfter(
            0,
            internal.vision.internalSmartAnalyzeImage,
            {
              imageId: image._id,
              userId: args.userId,
              imageUrl: image.imageUrl,
              title: image.title,
              description: image.description,
              tags: image.tags,
              category: image.category,
              source: image.source,
              sref: image.sref,
              variationCount: 0,
            },
          );
        }
      }

      if (await isDiscordLineage(ctx, image)) {
        const root = await resolveLineageRoot(ctx, image);
        try {
          await ctx.scheduler.runAfter(
            0,
            internalApi.discordNotifications.postStatus,
            {
              event: "approved",
              imageId: image._id,
              title: image.title,
              sref: image.sref || root?.sref,
              sourceUrl: image.sourceUrl || root?.sourceUrl,
              userId: args.userId,
              imageUrl: image.imageUrl,
              parentImageId: image.parentImageId,
            },
          );
        } catch (error) {
          console.warn(
            "Failed to schedule Discord approved notification",
            error,
          );
        }
      }

      return {
        ok: true,
        message: "Image approved.",
        status: nextStatus,
        aiStatus: shouldRunAnalysis ? "processing" : image.aiStatus,
      };
    }

    if (args.action === "reject") {
      if (await isDiscordLineage(ctx, image)) {
        const root = await resolveLineageRoot(ctx, image);
        try {
          await ctx.scheduler.runAfter(
            0,
            internalApi.discordNotifications.postStatus,
            {
              event: "rejected",
              imageId: image._id,
              title: image.title,
              sref: image.sref || root?.sref,
              sourceUrl: image.sourceUrl || root?.sourceUrl,
              userId: args.userId,
              imageUrl: image.imageUrl,
              parentImageId: image.parentImageId,
            },
          );
        } catch (error) {
          console.warn(
            "Failed to schedule Discord rejected notification",
            error,
          );
        }
      }

      await deleteImageRecord(ctx, image);
      return { ok: true, message: "Image rejected and deleted." };
    }

    if (image.status !== "active" && image.status !== "draft") {
      throw new Error("Image must be approved before generating variations.");
    }
    if (image.aiStatus === "processing") {
      throw new Error("Image is already processing.");
    }

    const variationCount = Math.min(Math.max(args.variationCount ?? 2, 1), 12);
    const modificationMode = args.modificationMode || "shot-variation";
    await ctx.db.patch(args.imageId, {
      aiStatus: "processing",
      variationCount,
      modificationMode,
      variationDetail: args.variationDetail,
    });

    if (triggerOrchestrationEnabled()) {
      await ctx.scheduler.runAfter(
        0,
        internalApi.triggerDispatch.dispatchVariationGeneration,
        {
          imageId: args.imageId,
          userId: args.userId,
          variationCount,
          modificationMode,
          variationDetail: args.variationDetail,
          aspectRatio: args.aspectRatio,
        },
      );
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.vision.internalGenerateRelatedImages,
        {
          originalImageId: args.imageId,
          requestedBy: args.userId,
          storageId: image.storageId,
          imageUrl: image.imageUrl,
          previewUrl: image.previewUrl,
          sourceUrl: image.sourceUrl,
          derivativeUrls: image.derivativeUrls,
          description: image.description || "",
          category: image.category,
          style: image.style,
          title: image.title,
          aspectRatio: args.aspectRatio,
          group: image.group,
          sref: image.sref,
          colors: image.colors,
          variationCount,
          modificationMode,
          variationDetail: args.variationDetail,
        },
      );
    }

    if (await isDiscordLineage(ctx, image)) {
      const root = await resolveLineageRoot(ctx, image);
      try {
        await ctx.scheduler.runAfter(
          0,
          internalApi.discordNotifications.postStatus,
          {
            event: "generation_started",
            imageId: image._id,
            title: image.title,
            sref: image.sref || root?.sref,
            sourceUrl: image.sourceUrl || root?.sourceUrl,
            userId: args.userId,
            imageUrl: image.imageUrl,
            parentImageId: image.parentImageId,
          },
        );
      } catch (error) {
        console.warn(
          "Failed to schedule Discord generation-started notification",
          error,
        );
      }
    }

    return {
      ok: true,
      message: `Started generation (${variationCount} variation${variationCount !== 1 ? "s" : ""}).`,
      status: image.status,
      aiStatus: "processing",
    };
  },
});

export const discordQueueHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const resolvedUserId = parseUserIdFromBody(body);
  if (!resolvedUserId) {
    return new Response("No target user found. Provide userId.", {
      status: 400,
    });
  }

  const limitRaw = Number.parseInt(String(body?.limit ?? ""), 10);
  const limit = Number.isNaN(limitRaw) ? 5 : limitRaw;
  let items = await ctx.runQuery(internalApi.images.internalListDiscordQueue, {
    userId: resolvedUserId,
    limit,
  });

  if (typeof body?.imageId === "string" && body.imageId.trim()) {
    items = items.filter(
      (item: any) => String(item._id) === body.imageId.trim(),
    );
  }

  return new Response(JSON.stringify({ items, userId: resolvedUserId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const discordModerateHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const resolvedUserId = parseUserIdFromBody(body);
  if (!resolvedUserId) {
    return new Response("No target user found. Provide userId.", {
      status: 400,
    });
  }

  const imageId =
    typeof body?.imageId === "string" && body.imageId.trim()
      ? body.imageId.trim()
      : null;
  if (!imageId) {
    return new Response("Missing required field: imageId", { status: 400 });
  }

  const action = body?.action;
  if (action !== "approve" && action !== "reject" && action !== "generate") {
    return new Response("Invalid action. Use approve, reject, or generate.", {
      status: 400,
    });
  }

  try {
    const result = await ctx.runMutation(
      internalApi.images.internalModerateDiscordImage,
      {
        userId: resolvedUserId,
        imageId,
        action,
        variationCount: body?.variationCount,
        modificationMode: body?.modificationMode,
        variationDetail: body?.variationDetail,
        aspectRatio: body?.aspectRatio,
      },
    );
    return new Response(
      JSON.stringify({ ...result, imageId, userId: resolvedUserId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(error?.message || "Moderation failed", { status: 400 });
  }
});

export const getPendingImages = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const pending = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();

    return pending.map((image) => mapImageForDisplay(image));
  },
});

export const approveImage = mutation({
  args: { imageId: v.id("images") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");

    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    const isModeratedSource = isModeratedImportSource(image.sourceType);
    const shouldRunAnalysis = shouldQueueAnalysis(image);
    const nextStatus = isModeratedSource ? "draft" : "active";
    await ctx.db.patch("images", args.imageId, {
      status: nextStatus,
      aiStatus: shouldRunAnalysis ? "processing" : image.aiStatus,
    });

    const triggerEnabled = triggerOrchestrationEnabled();
    if ((!image.colors || image.colors.length === 0) && !triggerEnabled) {
      await ctx.scheduler.runAfter(
        0,
        (internalApi as any).colorExtraction.internalExtractAndStoreColors,
        {
          imageId: image._id,
          imageUrl: preferredImageUrlForSampling(image) ?? image.imageUrl,
        },
      );
    }

    if (shouldRunAnalysis) {
      if (triggerEnabled) {
        await ctx.scheduler.runAfter(
          0,
          internalApi.triggerDispatch.dispatchImageMetadataRefresh,
          {
            imageId: image._id,
            userId,
            forcePalette: !image.colors?.length,
            runMetadata: true,
          },
        );
      } else {
        await ctx.scheduler.runAfter(
          0,
          internal.vision.internalSmartAnalyzeImage,
          {
            imageId: image._id,
            userId,
            imageUrl: image.imageUrl,
            title: image.title,
            description: image.description,
            tags: image.tags,
            category: image.category,
            source: image.source,
            sref: image.sref,
            variationCount: 0,
          },
        );
      }
    }

    if (await isDiscordLineage(ctx, image)) {
      const root = await resolveLineageRoot(ctx, image);
      try {
        await ctx.scheduler.runAfter(
          0,
          internalApi.discordNotifications.postStatus,
          {
            event: "approved",
            imageId: image._id,
            title: image.title,
            sref: image.sref || root?.sref,
            sourceUrl: image.sourceUrl || root?.sourceUrl,
            userId,
            imageUrl: image.imageUrl,
            parentImageId: image.parentImageId,
          },
        );
      } catch (error) {
        console.warn("Failed to schedule Discord approved notification", error);
      }
    }
    return null;
  },
});

export const rejectImage = mutation({
  args: { imageId: v.id("images") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");

    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    if (await isDiscordLineage(ctx, image)) {
      const root = await resolveLineageRoot(ctx, image);
      try {
        await ctx.scheduler.runAfter(
          0,
          internalApi.discordNotifications.postStatus,
          {
            event: "rejected",
            imageId: image._id,
            title: image.title,
            sref: image.sref || root?.sref,
            sourceUrl: image.sourceUrl || root?.sourceUrl,
            userId,
            imageUrl: image.imageUrl,
            parentImageId: image.parentImageId,
          },
        );
      } catch (error) {
        console.warn("Failed to schedule Discord rejected notification", error);
      }
    }

    await deleteImageRecord(ctx, image);
    return null;
  },
});
