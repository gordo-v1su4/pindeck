import { v } from "convex/values";
import {
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
} from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { preferredImageUrlForSampling } from "../colorExtractionUrls";
import { canModifyImage } from "../lib/authz";
import { canGenerateVariationFromImage } from "../lib/variationAccess";
import { triggerOrchestrationEnabled, internalApi } from "./shared";

export const enqueueCinematicMetadataBackfill = mutation({
  args: {
    onlyMissing: v.optional(v.boolean()),
    staggerMs: v.optional(v.number()),
    forceAll: v.optional(v.boolean()),
    imageIds: v.optional(v.array(v.id("images"))),
  },
  returns: v.object({ scheduled: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stagger = Math.max(500, args.staggerMs ?? 4500);
    const onlyMissing = args.forceAll !== true && args.onlyMissing !== false;

    const mine = args.imageIds
      ? (await Promise.all(args.imageIds.map((id) => ctx.db.get(id)))).filter(
          (img): img is NonNullable<typeof img> =>
            img !== null && img.uploadedBy === userId,
        )
      : await ctx.db
          .query("images")
          .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
          .collect();

    const targets = onlyMissing
      ? mine.filter((img) => {
          const g = img.genre?.trim();
          const sh = img.shot?.trim();
          const sty = img.style?.trim();
          const grp = img.group?.trim();
          return !(g && sh && sty && grp);
        })
      : mine;

    let delay = 0;
    let scheduled = 0;
    let skipped = 0;

    for (const img of targets) {
      const sourceStorageId = img.storageId;
      const sourceImageUrl = img.imageUrl;
      if (!sourceStorageId && !sourceImageUrl) {
        skipped += 1;
        continue;
      }

      await ctx.scheduler.runAfter(
        delay,
        internal.vision.internalSmartAnalyzeImage,
        {
          storageId: sourceStorageId,
          imageUrl: sourceImageUrl,
          imageId: img._id,
          userId,
          title: img.title,
          description: img.description || "",
          tags: img.tags,
          category: img.category,
          source: img.source,
          sref: img.sref,
          group: img.group,
          projectName: img.projectName,
          moodboardName: img.moodboardName,
          variationCount: 0,
          modificationMode: img.modificationMode ?? "shot-variation",
          variationType: img.variationType,
          variationDetail: img.variationDetail,
        },
      );
      delay += stagger;
      scheduled += 1;
    }

    return { scheduled, skipped };
  },
});

/** Schedule one refresh pass for image metadata and sampled palettes. */

export const enqueueMetadataRefresh = mutation({
  args: {
    onlyMissing: v.optional(v.boolean()),
    staggerMs: v.optional(v.number()),
    forceAll: v.optional(v.boolean()),
    imageIds: v.optional(v.array(v.id("images"))),
  },
  returns: v.object({
    metadataScheduled: v.number(),
    paletteScheduled: v.number(),
    skipped: v.number(),
    scheduledImageIds: v.array(v.id("images")),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stagger = Math.max(0, args.staggerMs ?? 0);
    const onlyMissing = args.forceAll !== true && args.onlyMissing !== false;

    const mine = args.imageIds
      ? (await Promise.all(args.imageIds.map((id) => ctx.db.get(id)))).filter(
          (img): img is NonNullable<typeof img> => img !== null,
        )
      : await ctx.db
          .query("images")
          .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
          .collect();

    const refreshPlan = mine
      .map((img) => {
        const g = img.genre?.trim();
        const sh = img.shot?.trim();
        const sty = img.style?.trim();
        const grp = img.group?.trim();
        const metadataMissing = !(g && sh && sty && grp);
        const paletteMissing = !img.colors?.length;
        return {
          img,
          metadataMissing,
          paletteMissing,
          runMetadata: args.forceAll === true || metadataMissing,
          forcePalette: args.forceAll === true || paletteMissing,
        };
      })
      .filter(
        (plan) => !onlyMissing || plan.metadataMissing || plan.paletteMissing,
      );

    let delay = 0;
    let metadataScheduled = 0;
    let paletteScheduled = 0;
    let skipped = 0;
    const scheduledImageIds: Array<Doc<"images">["_id"]> = [];

    for (const plan of refreshPlan) {
      const { img } = plan;
      const paletteUrl = preferredImageUrlForSampling(img);
      const sourceStorageId = img.storageId;
      const sourceImageUrl = img.imageUrl;
      if (!paletteUrl || (!sourceStorageId && !sourceImageUrl)) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(img._id, { aiStatus: "processing" });
      if (triggerOrchestrationEnabled()) {
        await ctx.scheduler.runAfter(
          delay,
          (internal as any).triggerDispatch.dispatchImageMetadataRefresh,
          {
            imageId: img._id,
            userId,
            forcePalette: plan.forcePalette,
            runMetadata: plan.runMetadata,
          },
        );
      } else {
        await ctx.scheduler.runAfter(
          delay,
          (internal as any).images.internalRefreshMetadataAfterPalette,
          {
            imageId: img._id,
            userId,
            paletteUrl,
            forcePalette: plan.forcePalette,
            runMetadata: plan.runMetadata,
          },
        );
      }
      delay += stagger;
      paletteScheduled += 1;
      if (plan.runMetadata) metadataScheduled += 1;
      scheduledImageIds.push(img._id);
    }

    return { metadataScheduled, paletteScheduled, skipped, scheduledImageIds };
  },
});

/** Rebuild the selected image's durable original/preview/derivative media through RustFS. */

export const internalRefreshMetadataAfterPalette: any = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    paletteUrl: v.string(),
    forcePalette: v.optional(v.boolean()),
    runMetadata: v.optional(v.boolean()),
  },
  returns: v.object({
    paletteOk: v.boolean(),
    metadataRan: v.boolean(),
    metadataOk: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    paletteOk: boolean;
    metadataRan: boolean;
    metadataOk: boolean;
    error?: string;
  }> => {
    const image: any = await ctx.runQuery(
      (internal as any).images.internalGetMetadataRefreshPayload,
      {
        imageId: args.imageId,
        userId: args.userId,
      },
    );
    if (!image) {
      return {
        paletteOk: false,
        metadataRan: false,
        metadataOk: false,
        error: "Image not found or not owned by user",
      };
    }

    let paletteOk = Boolean(image.colors?.length) && args.forcePalette !== true;
    if (!paletteOk) {
      const palette = await ctx.runAction(
        (internal as any).colorExtraction.internalExtractAndStoreColors,
        { imageId: args.imageId, imageUrl: args.paletteUrl },
      );
      paletteOk = Boolean(palette?.ok && palette.colors?.length);
    }

    if (!paletteOk) {
      await ctx.runMutation((internal as any).images.internalSetAiStatus, {
        imageId: args.imageId,
        status: "failed",
      });
      return {
        paletteOk: false,
        metadataRan: false,
        metadataOk: false,
        error: "Palette extraction did not complete",
      };
    }

    if (args.runMetadata === false) {
      await ctx.runMutation((internal as any).images.internalSetAiStatus, {
        imageId: args.imageId,
        status: "completed",
      });
      return { paletteOk: true, metadataRan: false, metadataOk: true };
    }

    const metadata: { ok: boolean; error?: string } = await ctx.runAction(
      (internal as any).vision.internalSmartAnalyzeImage,
      {
        storageId: image.storageId,
        imageUrl: image.imageUrl,
        imageId: image._id,
        userId: args.userId,
        title: image.title,
        description: image.description || "",
        tags: image.tags,
        category: image.category,
        source: image.source,
        sref: image.sref,
        group: image.group,
        projectName: image.projectName,
        moodboardName: image.moodboardName,
        variationCount: 0,
        modificationMode: image.modificationMode ?? "shot-variation",
        variationType: image.variationType,
        variationDetail: image.variationDetail,
      },
    );

    return {
      paletteOk: true,
      metadataRan: true,
      metadataOk: metadata.ok,
      error: metadata.error,
    };
  },
});

export const internalGetImageForAnalysis = internalQuery({
  args: { imageId: v.id("images") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.get("images", args.imageId);
  },
});

export const internalCanModifyImage = internalQuery({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get("images", args.imageId);
    if (!image) return false;
    return canModifyImage(ctx, image, args.userId);
  },
});

export const internalUpdateAnalysis = internalMutation({
  args: {
    imageId: v.id("images"),
    title: v.optional(v.string()),
    description: v.string(),
    tags: v.optional(v.array(v.string())),
    colors: v.array(v.string()),
    category: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
    group: v.optional(v.string()),
    genre: v.optional(v.string()),
    style: v.optional(v.string()),
    shot: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingImage = await ctx.db.get("images", args.imageId);
    // NOTE: we intentionally do NOT write `colors` here. The VLM was
    // guessing plausible-looking hexes instead of sampling pixels, producing
    // inaccurate swatches. Colors are now owned exclusively by the
    // pixel-accurate server extractor in convex/colorExtraction.ts.
    void existingImage;
    const patch: any = {
      description: args.description,
    };
    const shouldSyncProjectName =
      existingImage?.sourceType === "upload" ||
      existingImage?.sourceType === "discord" ||
      existingImage?.sourceType === "pinterest";

    if (args.title) patch.title = args.title;
    if (args.tags) patch.tags = args.tags;
    if (args.category) patch.category = args.category;
    if (args.aiStatus) patch.aiStatus = args.aiStatus;
    if (args.group !== undefined) patch.group = args.group;
    if (args.genre !== undefined) patch.genre = args.genre;
    if (args.style !== undefined) patch.style = args.style;
    if (args.shot !== undefined) patch.shot = args.shot;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    else if (shouldSyncProjectName && args.title)
      patch.projectName = args.title;
    if (args.moodboardName !== undefined)
      patch.moodboardName = args.moodboardName;
    // Preserve sref if provided, otherwise don't overwrite existing value
    if (args.sref !== undefined) patch.sref = args.sref;

    await ctx.db.patch("images", args.imageId, patch);
    return null;
  },
});

export const internalSetAiStatus = internalMutation({
  args: {
    imageId: v.id("images"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, { aiStatus: args.status });
    return null;
  },
});

export const internalGetMetadataRefreshPayload = internalQuery({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    allowActiveShared: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (
      !image ||
      (image.uploadedBy !== args.userId &&
        !(
          args.allowActiveShared &&
          canGenerateVariationFromImage(image, args.userId)
        ))
    ) {
      return null;
    }
    return {
      _id: image._id,
      storageId: image.storageId,
      imageUrl: image.imageUrl,
      previewUrl: image.previewUrl,
      derivativeUrls: image.derivativeUrls,
      title: image.title,
      description: image.description,
      tags: image.tags,
      category: image.category,
      source: image.source,
      sref: image.sref,
      group: image.group,
      projectName: image.projectName,
      moodboardName: image.moodboardName,
      modificationMode: image.modificationMode,
      variationType: image.variationType,
      variationDetail: image.variationDetail,
      colors: image.colors,
      sourceType: image.sourceType,
      sourceUrl: image.sourceUrl,
      status: image.status,
      aiStatus: image.aiStatus,
      storagePath: image.storagePath,
      storagePersistStatus: image.storagePersistStatus,
      orchestrationRunId: image.orchestrationRunId,
      orchestrationDispatchId: image.orchestrationDispatchId,
      orchestrationTask: image.orchestrationTask,
      orchestrationStatus: image.orchestrationStatus,
      orchestrationStep: image.orchestrationStep,
      orchestrationResult: image.orchestrationResult,
    };
  },
});

export const updateAnalysis = mutation({
  args: {
    imageId: v.id("images"),
    description: v.string(),
    colors: v.array(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    if (image.uploadedBy !== userId) {
      throw new Error("Not authorized to update this image");
    }

    await ctx.runMutation(internalApi.images.internalUpdateAnalysis, args);

    return { success: true };
  },
});

export const updateImageMetadata = mutation({
  args: {
    imageId: v.id("images"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    group: v.optional(v.string()),
    genre: v.optional(v.string()),
    style: v.optional(v.string()),
    shot: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    uniqueId: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    if (!(await canModifyImage(ctx, image, userId))) {
      throw new Error("Not authorized to edit this image");
    }

    const patch: any = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.category !== undefined) patch.category = args.category;
    if (args.source !== undefined) patch.source = args.source;
    if (args.sref !== undefined) patch.sref = args.sref;
    if (args.colors !== undefined) patch.colors = args.colors;
    if (args.group !== undefined) patch.group = args.group;
    if (args.genre !== undefined) patch.genre = args.genre;
    if (args.style !== undefined) patch.style = args.style;
    if (args.shot !== undefined) patch.shot = args.shot;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    if (args.moodboardName !== undefined)
      patch.moodboardName = args.moodboardName;
    if (args.uniqueId !== undefined) patch.uniqueId = args.uniqueId;

    await ctx.db.patch("images", args.imageId, patch);

    return { success: true };
  },
});

/** Let the user mark an image's AI status (e.g. "completed" or "failed") to unstick stuck processing. */

export const setAiStatus = mutation({
  args: {
    imageId: v.id("images"),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const image = await ctx.db.get("images", args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Image not found or not yours");
    }
    await ctx.db.patch("images", args.imageId, { aiStatus: args.status });
    return null;
  },
});

/** Set order of images in a project row (and optionally move images to that project). Syncs from project-rows drag-and-drop. */
