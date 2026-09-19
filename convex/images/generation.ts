import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { preferredImageUrlForSampling } from "../colorExtractionUrls";
import {
  internalApi,
  isDiscordLineage,
  resolveLineageRoot,
  resolveModeratedLineageSource,
  storageProviderFromPayload,
  triggerOrchestrationEnabled,
} from "./shared";

export const backfillGenerationsFromAiImages = mutation({
  args: {
    limit: v.optional(v.number()),
    imageIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const take = Math.min(Math.max(args.limit ?? 400, 1), 2000);
    const images = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .order("desc")
      .take(take);

    const generated = images.filter(
      (img) =>
        img.source === "AI Generation" ||
        (Array.isArray(img.tags) && img.tags.includes("generated")),
    );

    let inserted = 0;
    let skippedExisting = 0;

    for (const img of generated) {
      const existing = await ctx.db
        .query("generations")
        .withIndex("by_image", (q) => q.eq("imageId", img._id))
        .take(1);
      if (existing.length > 0) {
        skippedExisting += 1;
        continue;
      }

      await ctx.db.insert("generations", {
        imageId: img._id,
        type: "deck",
        templateId: "fal-image-generation",
        templateName: "FAL Image Generation",
        title: img.title || "Generated Image",
        description: img.description,
        content: JSON.stringify({
          imageId: img._id,
          imageUrl: img.imageUrl,
          previewUrl: img.previewUrl,
          sourceUrl: img.sourceUrl,
          parentImageId: img.parentImageId,
          sourceType: img.sourceType,
          nextcloudPersistStatus: img.nextcloudPersistStatus,
          createdAt: img.uploadedAt ?? img._creationTime,
        }),
        createdBy: userId,
        createdAt: img.uploadedAt ?? Date.now(),
      });
      inserted += 1;
    }

    return {
      scanned: generated.length,
      inserted,
      skippedExisting,
    };
  },
});

export const internalSaveGeneratedImages = internalMutation({
  args: {
    originalImageId: v.id("images"),
    requestedBy: v.id("users"),
    markParentComplete: v.optional(v.boolean()),
    images: v.array(
      v.object({
        artifactKey: v.optional(v.string()),
        url: v.string(),
        sourceUrl: v.optional(v.string()),
        previewUrl: v.optional(v.string()),
        storagePath: v.optional(v.string()),
        storageProvider: v.optional(
          v.union(
            v.literal("convex"),
            v.literal("nextcloud"),
            v.literal("rustfs"),
          ),
        ),
        storageBucket: v.optional(v.string()),
        previewStoragePath: v.optional(v.string()),
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
        title: v.string(),
        description: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const originalImage = await ctx.db.get("images", args.originalImageId);
    if (!originalImage) return;
    const root = await resolveLineageRoot(ctx, originalImage);
    const discordLineage = await isDiscordLineage(ctx, originalImage);
    const moderatedLineageSource = await resolveModeratedLineageSource(
      ctx,
      originalImage,
    );
    const inheritedSourceType = moderatedLineageSource || "ai";
    const shouldReturnToModeration = Boolean(moderatedLineageSource);

    for (const img of args.images) {
      if (img.artifactKey) {
        const existing = await ctx.db
          .query("images")
          .withIndex("by_generation_artifact", (q) =>
            q.eq("generationArtifactKey", img.artifactKey),
          )
          .first();
        if (existing) continue;
      }
      const childImageId = await ctx.db.insert("images", {
        title: originalImage.title, // Inherit parent's exact title so they group together
        description: originalImage.description || img.description, // Inherit parent's full description
        imageUrl: img.url,
        previewUrl: img.previewUrl,
        storageProvider: storageProviderFromPayload({
          storageProvider: img.storageProvider,
          storageBucket: img.storageBucket,
          imageUrl: img.url,
          storagePath: img.storagePath,
        }),
        storageBucket: img.storageBucket,
        storagePath: img.storagePath,
        previewStoragePath: img.previewStoragePath,
        derivativeUrls: img.derivativeUrls,
        derivativeStoragePaths: img.derivativeStoragePaths,
        nextcloudPersistStatus: img.storagePath ? "succeeded" : "failed",
        storagePersistStatus: img.storagePath ? "succeeded" : "failed",
        // Inherit metadata from original (which might have been updated by analysis)
        category: originalImage.category,
        tags: [...originalImage.tags, "generated", "variation"],
        colors: originalImage.colors?.length ? originalImage.colors : [],
        uploadedBy: args.requestedBy,
        likes: 0,
        views: 0,
        source: "AI Generation",
        sourceType: inheritedSourceType,
        sourceUrl: img.sourceUrl || originalImage.sourceUrl || root?.sourceUrl,
        // Inherit group, projectName, moodboardName, uniqueId from parent
        group: originalImage.group,
        projectName: originalImage.projectName,
        moodboardName: originalImage.moodboardName,
        uniqueId: originalImage.uniqueId,
        variationCount: originalImage.variationCount,
        modificationMode: originalImage.modificationMode,
        // Carry sref from root/parent so child variations preserve the same reference lineage
        sref: originalImage.sref || root?.sref,
        parentImageId: args.originalImageId, // Link back to parent image (lineage tracking)
        generationArtifactKey: img.artifactKey,
        status: shouldReturnToModeration ? "pending" : "active",
        aiStatus: "processing",
        uploadedAt: Date.now(),
      });

      if (triggerOrchestrationEnabled()) {
        await ctx.scheduler.runAfter(
          0,
          internalApi.triggerDispatch.dispatchImageMetadataRefresh,
          {
            imageId: childImageId,
            userId: args.requestedBy,
            forcePalette: true,
            runMetadata: true,
          },
        );
      } else {
        await ctx.scheduler.runAfter(
          0,
          internalApi.images.internalRefreshMetadataAfterPalette,
          {
            imageId: childImageId,
            userId: args.requestedBy,
            paletteUrl:
              preferredImageUrlForSampling({
                imageUrl: img.url,
                derivativeUrls: img.derivativeUrls,
              }) ?? img.url,
            forcePalette: true,
            runMetadata: true,
          },
        );
      }

      if (discordLineage) {
        try {
          await ctx.scheduler.runAfter(
            0,
            internalApi.discordNotifications.postStatus,
            {
              event: "generated",
              imageId: childImageId,
              parentImageId: originalImage._id,
              title: originalImage.title,
              sref: originalImage.sref || root?.sref,
              sourceUrl: originalImage.sourceUrl || root?.sourceUrl,
              userId: args.requestedBy,
              imageUrl: img.url,
            },
          );
        } catch (error) {
          console.warn(
            "Failed to schedule Discord generated notification",
            error,
          );
        }
      }
    }

    if (args.markParentComplete !== false) {
      await ctx.db.patch("images", args.originalImageId, {
        aiStatus: "completed",
      });
    }
    return null;
  },
});

export const internalGetGeneratedArtifactByKey = internalQuery({
  args: {
    originalImageId: v.id("images"),
    requestedBy: v.id("users"),
    artifactKey: v.string(),
  },
  returns: v.union(
    v.object({
      imageId: v.id("images"),
      imageUrl: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .withIndex("by_generation_artifact", (q) =>
        q.eq("generationArtifactKey", args.artifactKey),
      )
      .first();
    if (
      !image ||
      image.parentImageId !== args.originalImageId ||
      image.uploadedBy !== args.requestedBy
    ) {
      return null;
    }
    return { imageId: image._id, imageUrl: image.imageUrl };
  },
});
