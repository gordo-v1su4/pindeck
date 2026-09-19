import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { httpAction, mutation, internalMutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { preferredImageUrlForSampling } from "../colorExtractionUrls";
import {
  assertSafeStoragePath,
  internalApi,
  isModeratedImportSource,
  normalizeExternalImageUrl,
  storageProviderFromPayload,
  triggerOrchestrationEnabled,
} from "./shared";

const internalIngestExternalRef: FunctionReference<"mutation", "internal"> = (
  internal as unknown as {
    "images/ingest": { ingestExternal: FunctionReference<"mutation", "internal"> };
  }
)["images/ingest"].ingestExternal;

export const createExternal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    previewUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    storageProvider: v.optional(
      v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs")),
    ),
    storageBucket: v.optional(v.string()),
    previewStoragePath: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    derivativeUrls: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      }),
    ),
    derivativeStoragePaths: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      }),
    ),
    externalId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("upload"),
        v.literal("discord"),
        v.literal("pinterest"),
        v.literal("ai"),
      ),
    ),
    sourceUrl: v.optional(v.string()),
    importBatchId: v.optional(v.id("importBatches")),
  },
  returns: v.id("images"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create images");
    }

    if (args.storagePath)
      assertSafeStoragePath(args.storagePath, "storagePath");
    if (args.previewStoragePath)
      assertSafeStoragePath(args.previewStoragePath, "previewStoragePath");
    if (args.derivativeStoragePaths) {
      assertSafeStoragePath(
        args.derivativeStoragePaths.small,
        "derivativeStoragePaths.small",
      );
      assertSafeStoragePath(
        args.derivativeStoragePaths.medium,
        "derivativeStoragePaths.medium",
      );
      assertSafeStoragePath(
        args.derivativeStoragePaths.large,
        "derivativeStoragePaths.large",
      );
    }

    if (args.externalId) {
      const existing = await ctx.db
        .query("images")
        .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
        .unique();
      if (existing) {
        if (
          (!existing.colors || existing.colors.length === 0) &&
          args.colors?.length
        ) {
          await ctx.db.patch(existing._id, { colors: args.colors });
        }
        return existing._id;
      }
    }

    const existingByUrl = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("imageUrl"), args.imageUrl))
      .take(1);
    if (existingByUrl[0]) {
      if (
        (!existingByUrl[0].colors || existingByUrl[0].colors.length === 0) &&
        args.colors?.length
      ) {
        await ctx.db.patch(existingByUrl[0]._id, { colors: args.colors });
      }
      return existingByUrl[0]._id;
    }

    const title = args.title || "Untitled";
    const category = args.category || "General";
    const tags = args.tags
      ? [...new Set([...args.tags, "original"])]
      : ["original"];
    const isModeratedImport = isModeratedImportSource(args.sourceType);
    const storageProvider = storageProviderFromPayload(args);
    const projectName = args.sourceType === "ai" ? undefined : title;

    const imageId = await ctx.db.insert("images", {
      title,
      description: args.description,
      imageUrl: args.imageUrl,
      previewUrl: args.previewUrl,
      tags,
      category,
      projectName,
      source: args.source,
      sref: args.sref,
      uploadedBy: userId,
      likes: 0,
      views: 0,
      status: isModeratedImport ? "pending" : "active",
      aiStatus: isModeratedImport ? "queued" : "processing",
      uploadedAt: Date.now(),
      storageProvider,
      storageBucket: args.storageBucket,
      storagePath: args.storagePath,
      previewStoragePath: args.previewStoragePath,
      derivativeUrls: args.derivativeUrls,
      derivativeStoragePaths: args.derivativeStoragePaths,
      colors: args.colors ?? [],
      nextcloudPersistStatus: args.storagePath ? "succeeded" : undefined,
      storagePersistStatus: args.storagePath ? "succeeded" : undefined,
      externalId: args.externalId,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      importBatchId: args.importBatchId,
      ingestedAt: Date.now(),
    });

    if (args.sourceType === "discord") {
      try {
        await ctx.scheduler.runAfter(
          0,
          internalApi.discordNotifications.postStatus,
          {
            event: "queued",
            imageId,
            title,
            sref: args.sref,
            sourceUrl: args.sourceUrl,
            userId,
            imageUrl: args.imageUrl,
          },
        );
      } catch (error) {
        console.warn("Failed to schedule Discord queued notification", error);
      }
    }

    if (!isModeratedImport) {
      await ctx.scheduler.runAfter(
        0,
        internal.vision.internalSmartAnalyzeImage,
        {
          imageId,
          userId,
          imageUrl: args.imageUrl,
          title,
          description: args.description,
          tags,
          category,
          source: args.source,
          sref: args.sref,
          variationCount: 0,
        },
      );
    }

    return imageId;
  },
});

export const ingestExternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    previewUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    storageProvider: v.optional(
      v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs")),
    ),
    storageBucket: v.optional(v.string()),
    previewStoragePath: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    derivativeUrls: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      }),
    ),
    derivativeStoragePaths: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      }),
    ),
    externalId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("upload"),
        v.literal("discord"),
        v.literal("pinterest"),
        v.literal("ai"),
      ),
    ),
    sourceUrl: v.optional(v.string()),
    importBatchId: v.optional(v.id("importBatches")),
    deferProcessing: v.optional(v.boolean()),
  },
  returns: v.object({
    imageId: v.id("images"),
    created: v.boolean(),
    needsProcessing: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.externalId) {
      const existing = await ctx.db
        .query("images")
        .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
        .unique();
      if (existing) {
        if (
          (!existing.colors || existing.colors.length === 0) &&
          args.colors?.length
        ) {
          await ctx.db.patch(existing._id, { colors: args.colors });
        }
        return {
          imageId: existing._id,
          created: false,
          needsProcessing:
            existing.storagePersistStatus !== "succeeded" ||
            !existing.storagePath,
        };
      }
    }

    const existingByUrl = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", args.userId))
      .filter((q) => q.eq(q.field("imageUrl"), args.imageUrl))
      .take(1);
    if (existingByUrl[0]) {
      if (
        (!existingByUrl[0].colors || existingByUrl[0].colors.length === 0) &&
        args.colors?.length
      ) {
        await ctx.db.patch(existingByUrl[0]._id, { colors: args.colors });
      }
      return {
        imageId: existingByUrl[0]._id,
        created: false,
        needsProcessing:
          existingByUrl[0].storagePersistStatus !== "succeeded" ||
          !existingByUrl[0].storagePath,
      };
    }

    const title = args.title || "Untitled";
    const category = args.category || "General";
    const tags = args.tags
      ? [...new Set([...args.tags, "original"])]
      : ["original"];
    const isModeratedImport = isModeratedImportSource(args.sourceType);
    const storageProvider = storageProviderFromPayload(args);
    const projectName = args.sourceType === "ai" ? undefined : title;

    const imageId = await ctx.db.insert("images", {
      title,
      description: args.description,
      imageUrl: args.imageUrl,
      previewUrl: args.previewUrl,
      tags,
      category,
      projectName,
      source: args.source,
      sref: args.sref,
      uploadedBy: args.userId,
      likes: 0,
      views: 0,
      status: isModeratedImport ? "pending" : "active",
      aiStatus: isModeratedImport ? "queued" : "processing",
      uploadedAt: Date.now(),
      storageProvider,
      storageBucket: args.storageBucket,
      storagePath: args.storagePath,
      previewStoragePath: args.previewStoragePath,
      derivativeUrls: args.derivativeUrls,
      derivativeStoragePaths: args.derivativeStoragePaths,
      colors: args.colors ?? [],
      nextcloudPersistStatus: args.deferProcessing
        ? "pending"
        : args.storagePath
          ? "succeeded"
          : undefined,
      storagePersistStatus: args.deferProcessing
        ? "pending"
        : args.storagePath
          ? "succeeded"
          : undefined,
      externalId: args.externalId,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      importBatchId: args.importBatchId,
      ingestedAt: Date.now(),
    });

    if (!args.deferProcessing && args.sourceType === "discord") {
      try {
        await ctx.scheduler.runAfter(
          0,
          internalApi.discordNotifications.postStatus,
          {
            event: "queued",
            imageId,
            title,
            sref: args.sref,
            sourceUrl: args.sourceUrl,
            userId: args.userId,
            imageUrl: args.imageUrl,
          },
        );
      } catch (error) {
        console.warn("Failed to schedule Discord queued notification", error);
      }
    }

    if (!args.deferProcessing && !isModeratedImport) {
      await ctx.scheduler.runAfter(
        0,
        internal.vision.internalSmartAnalyzeImage,
        {
          imageId,
          userId: args.userId,
          imageUrl: args.imageUrl,
          title,
          description: args.description,
          tags,
          category,
          source: args.source,
          sref: args.sref,
          variationCount: 0,
        },
      );
    }

    return {
      imageId,
      created: true,
      needsProcessing: args.deferProcessing === true,
    };
  },
});

export const ingestExternalHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  if (!body?.imageUrl) {
    return new Response("Missing required fields: imageUrl", { status: 400 });
  }

  const resolvedUserId =
    typeof body.userId === "string" && body.userId.trim()
      ? body.userId
      : undefined;

  if (!resolvedUserId) {
    return new Response("No target user found. Provide userId.", {
      status: 400,
    });
  }

  const sourceImageUrl = normalizeExternalImageUrl(body.imageUrl);
  if (!sourceImageUrl) {
    return new Response("Missing required fields: imageUrl", { status: 400 });
  }

  if (triggerOrchestrationEnabled()) {
    const queued = await ctx.runMutation(internalIngestExternalRef, {
      userId: resolvedUserId,
      title: body.title || "External Import",
      description: body.description,
      imageUrl: sourceImageUrl,
      tags: body.tags,
      category: body.category,
      source: body.source,
      sref: body.sref,
      externalId: body.externalId,
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl || sourceImageUrl,
      importBatchId: body.importBatchId,
      deferProcessing: true,
    });

    if (queued.needsProcessing) {
      await ctx.scheduler.runAfter(
        0,
        internalApi.triggerDispatch.dispatchExternalIngest,
        {
          imageId: queued.imageId,
          userId: resolvedUserId,
        },
      );
    }

    return new Response(
      JSON.stringify({
        imageId: queued.imageId,
        userId: resolvedUserId,
        queued: queued.needsProcessing,
        duplicate: !queued.created,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let persistedImage;
  try {
    persistedImage = await ctx.runAction(
      internalApi.mediaStorage.persistExternalImageFromUrl,
      {
        sourceUrl: sourceImageUrl,
        title: body.title || "Discord Import",
      },
    );
  } catch (error: any) {
    console.error("RustFS persist failed during external ingest", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to persist image to RustFS",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const ingestResult = await ctx.runMutation(internalIngestExternalRef, {
    userId: resolvedUserId,
    title: body.title || "Discord Import",
    description: body.description,
    imageUrl: persistedImage.imageUrl,
    previewUrl: persistedImage.previewUrl,
    tags: body.tags,
    category: body.category,
    source: body.source,
    sref: body.sref,
    storagePath: persistedImage.storagePath,
    storageProvider: persistedImage.bucket ? "rustfs" : "nextcloud",
    storageBucket: persistedImage.bucket,
    previewStoragePath: persistedImage.previewStoragePath,
    colors: persistedImage.colors,
    derivativeUrls: persistedImage.derivativeUrls,
    derivativeStoragePaths: persistedImage.derivativeStoragePaths,
    externalId: body.externalId,
    sourceType: body.sourceType,
    sourceUrl: body.sourceUrl || sourceImageUrl,
    importBatchId: body.importBatchId,
  });
  const imageId = ingestResult.imageId;

  // Pixel-accurate server-side color sampling. Runs against the persisted
  // RustFS URL so we don't depend on cdn.discordapp.com CORS.
  await ctx.scheduler.runAfter(
    0,
    (internalApi as any).colorExtraction.internalExtractAndStoreColors,
    {
      imageId,
      imageUrl:
        preferredImageUrlForSampling(persistedImage) ?? persistedImage.imageUrl,
    },
  );

  return new Response(JSON.stringify({ imageId, userId: resolvedUserId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
