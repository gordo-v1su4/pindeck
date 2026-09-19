import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalApi,
  mapImageForDisplay,
  triggerOrchestrationEnabled,
} from "./shared";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  returns: v.id("images"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create images");
    }

    return await ctx.db.insert("images", {
      ...args,
      tags: [...args.tags, "original"], // Tag as original user upload
      uploadedBy: userId,
      likes: 0,
      views: 0,
      uploadedAt: Date.now(),
    });
  },
});

export const internalCreate = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  returns: v.id("images"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("images", {
      ...args,
      likes: 0,
      views: 0,
      uploadedAt: Date.now(),
    });
  },
});

export const internalGenerateUploadUrl = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload images");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadMultiple = mutation({
  args: {
    uploads: v.array(
      v.object({
        storageId: v.id("_storage"),
        originalFileName: v.optional(v.string()),
        title: v.string(),
        description: v.optional(v.string()),
        tags: v.array(v.string()),
        category: v.string(),
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
        // Variation count for auto-generation right after smart analysis.
        variationCount: v.optional(v.number()),
      }),
    ),
  },
  returns: v.array(v.id("images")),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload images");
    }

    const results = await Promise.all(
      args.uploads.map(async (upload) => {
        const tempUrl = await ctx.storage.getUrl(upload.storageId);
        if (!tempUrl) {
          throw new Error("Failed to get temporary image URL");
        }
        const imageId = await ctx.db.insert("images", {
          title: upload.title,
          description: upload.description,
          // Temporary Convex URL while finalizeUploadedImage persists to Nextcloud.
          imageUrl: tempUrl,
          previewUrl: tempUrl,
          storageId: upload.storageId,
          tags: upload.tags,
          category: upload.category,
          source: upload.source,
          sref: upload.sref,
          colors: upload.colors ?? [],
          group: upload.group,
          genre: upload.genre,
          style: upload.style,
          shot: upload.shot,
          projectName: upload.projectName,
          moodboardName: upload.moodboardName,
          uniqueId: upload.uniqueId,
          uploadedBy: userId,
          likes: 0,
          views: 0,
          aiStatus: "processing",
          status: "draft",
          sourceType: "upload",
          storageProvider: "convex",
          nextcloudPersistStatus: "pending",
          storagePersistStatus: "pending",
          uploadedAt: Date.now(),
        });

        try {
          if (triggerOrchestrationEnabled()) {
            await ctx.scheduler.runAfter(
              0,
              internalApi.triggerDispatch.dispatchFinalizeUpload,
              {
                imageId,
                userId,
              },
            );
          } else {
            await ctx.scheduler.runAfter(
              0,
              internalApi.mediaStorage.finalizeUploadedImage,
              {
                storageId: upload.storageId,
                imageId,
                userId,
                group: upload.group,
                projectName: upload.projectName,
                moodboardName: upload.moodboardName,
                title: upload.title,
                description: upload.description,
                tags: upload.tags,
                category: upload.category,
                source: upload.source,
                sref: upload.sref || undefined,
                variationCount: upload.variationCount,
                sourceType: "upload",
              },
            );
          }
        } catch (err) {
          console.error("Failed to schedule Nextcloud finalize action:", err);
          await ctx.db.patch("images", imageId, { aiStatus: "failed" });
        }

        return imageId;
      }),
    );

    return results;
  },
});

export const getDraftImages = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const drafts = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .order("desc")
      .collect();
    return drafts.map((img) => mapImageForDisplay(img));
  },
});

export const finalizeUploads = mutation({
  args: { imageIds: v.array(v.id("images")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (const id of args.imageIds) {
      const image = await ctx.db.get("images", id);
      if (image && image.uploadedBy === userId) {
        await ctx.db.patch("images", id, { status: "active" });
      }
    }
    return null;
  },
});

export const getProcessingImages = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allProcessing = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("aiStatus"), "processing"))
      .order("desc")
      .collect();

    // Hide very old "processing" items from the active queue.
    const staleCutoffMs = Date.now() - 18 * 60 * 60 * 1000;
    return allProcessing
      .filter((img) => (img.uploadedAt ?? 0) >= staleCutoffMs)
      .map((img) => mapImageForDisplay(img));
  },
});

export const clearMyStaleProcessingImages = mutation({
  args: {
    olderThanHours: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const olderThanMs = Math.max(1, args.olderThanHours ?? 18) * 60 * 60 * 1000;
    const cutoff = Date.now() - olderThanMs;

    const candidates = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("aiStatus"), "processing"))
      .collect();

    let updated = 0;
    for (const image of candidates) {
      if ((image.uploadedAt ?? 0) > cutoff) continue;
      await ctx.db.patch(image._id, { aiStatus: "failed" });
      updated += 1;
    }

    return updated;
  },
});

export const internalGetUploadFinalizePayload = internalQuery({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (
      !image ||
      image.uploadedBy !== args.userId ||
      image.sourceType !== "upload"
    ) {
      return null;
    }
    return {
      imageId: image._id,
      userId: args.userId,
      storageId: image.storageId,
      title: image.title,
      description: image.description,
      tags: image.tags,
      category: image.category,
      source: image.source,
      sref: image.sref,
      group: image.group,
      projectName: image.projectName,
      moodboardName: image.moodboardName,
      variationCount: image.variationCount,
      sourceType: image.sourceType,
      imageUrl: image.imageUrl,
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
