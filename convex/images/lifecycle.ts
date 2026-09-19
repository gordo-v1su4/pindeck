import { v } from "convex/values";
import {
  httpAction,
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
} from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { preferredImageUrlForSampling } from "../colorExtractionUrls";
import { canModifyImage, isAdminUser } from "../lib/authz";
import {
  deleteImageRecord,
  hasCollapsedNextcloudVariants,
  internalApi,
  isRustfsUrl,
  pickBackfillSourceUrl,
  pickMediaRepairSourceUrl,
  pickMediaRepairSourceUrls,
  readBearerToken,
  storageProviderFromPayload,
  triggerOrchestrationEnabled,
} from "./shared";

export const enqueueMediaRepair = mutation({
  args: {
    imageId: v.id("images"),
  },
  returns: v.object({ scheduled: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get(args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Image not found or not yours");
    }

    const sourceUrl = pickMediaRepairSourceUrl(image);
    if (!sourceUrl) {
      throw new Error("No recoverable image URL found for media regeneration");
    }

    await ctx.db.patch(args.imageId, {
      storagePersistStatus: "pending",
      storagePersistError: undefined,
      nextcloudPersistStatus: "pending",
      nextcloudPersistError: undefined,
    });
    const repairAction = triggerOrchestrationEnabled()
      ? internalApi.triggerDispatch.dispatchMediaRepair
      : internalApi.images.internalRepairImageMedia;
    await ctx.scheduler.runAfter(0, repairAction, {
      imageId: args.imageId,
      userId,
    });

    return { scheduled: true };
  },
});

/** Queue media repair for a set of images owned by the current user. */

export const enqueueMediaRepairMany = mutation({
  args: {
    imageIds: v.array(v.id("images")),
    staggerMs: v.optional(v.number()),
  },
  returns: v.object({
    scheduled: v.number(),
    skipped: v.number(),
    scheduledImageIds: v.array(v.id("images")),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stagger = Math.max(0, args.staggerMs ?? 1_000);
    const images = (
      await Promise.all(args.imageIds.map((id) => ctx.db.get(id)))
    )
      .filter((image): image is NonNullable<typeof image> => Boolean(image))
      .filter((image) => image.uploadedBy === userId);
    let scheduled = 0;
    let skipped = 0;
    const scheduledImageIds: Array<Doc<"images">["_id"]> = [];

    for (const image of images) {
      if (pickMediaRepairSourceUrls(image).length === 0) {
        skipped += 1;
        continue;
      }
      await ctx.db.patch(image._id, {
        storagePersistStatus: "pending",
        storagePersistError: undefined,
        nextcloudPersistStatus: "pending",
        nextcloudPersistError: undefined,
      });
      const repairAction = triggerOrchestrationEnabled()
        ? internalApi.triggerDispatch.dispatchMediaRepair
        : internalApi.images.internalRepairImageMedia;
      await ctx.scheduler.runAfter(scheduled * stagger, repairAction, {
        imageId: image._id,
        userId,
      });
      scheduled += 1;
      scheduledImageIds.push(image._id);
    }

    return { scheduled, skipped, scheduledImageIds };
  },
});

export const internalRepairImageMedia = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
  },
  returns: v.object({
    ok: v.boolean(),
    imageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: boolean; imageUrl?: string; error?: string }> => {
    const image: any = await ctx.runQuery(
      internalApi.images.internalGetMediaRepairPayload,
      {
        imageId: args.imageId,
        userId: args.userId,
      },
    );
    if (!image)
      return { ok: false, error: "Image not found or not owned by user" };

    const sourceUrls = pickMediaRepairSourceUrls(image);
    if (sourceUrls.length === 0) {
      await ctx.runMutation(
        internalApi.images.internalRecordNextcloudBackfillFailure,
        {
          imageId: args.imageId,
          error: "No recoverable image URL found for media regeneration",
        },
      );
      return {
        ok: false,
        error: "No recoverable image URL found for media regeneration",
      };
    }

    try {
      let persisted: any;
      let lastError: unknown;
      for (const sourceUrl of sourceUrls) {
        try {
          persisted = await ctx.runAction(
            internalApi.mediaStorage.persistExternalImageFromUrl,
            { sourceUrl, title: image.title },
          );
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!persisted) {
        throw lastError instanceof Error
          ? lastError
          : new Error("All media repair source URLs failed");
      }
      await ctx.runMutation(internalApi.images.internalApplyNextcloudUpload, {
        imageId: args.imageId,
        imageUrl: persisted.imageUrl,
        previewUrl: persisted.previewUrl,
        storageProvider: persisted.bucket ? "rustfs" : undefined,
        storageBucket: persisted.bucket,
        storagePath: persisted.storagePath,
        previewStoragePath: persisted.previewStoragePath,
        colors: persisted.colors,
        derivativeUrls: persisted.derivativeUrls,
        derivativeStoragePaths: persisted.derivativeStoragePaths,
      });

      await ctx.runAction(
        internalApi.colorExtraction.internalExtractAndStoreColors,
        {
          imageId: args.imageId,
          imageUrl:
            preferredImageUrlForSampling(persisted) ?? persisted.imageUrl,
        },
      );

      return { ok: true, imageUrl: persisted.imageUrl };
    } catch (error: any) {
      const message = error?.message || "Media regeneration failed";
      await ctx.runMutation(
        internalApi.images.internalRecordNextcloudBackfillFailure,
        {
          imageId: args.imageId,
          error: message,
        },
      );
      return { ok: false, error: message };
    }
  },
});

export const backfillNextcloudHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body?.limit ?? 200), 1000));
  const dryRun = Boolean(body?.dryRun);
  const refreshVariants = Boolean(body?.refreshVariants);
  const imageIds = Array.isArray(body?.imageIds)
    ? body.imageIds.filter(
        (id: unknown): id is string => typeof id === "string",
      )
    : undefined;
  const images = await ctx.runQuery(
    internalApi.images.internalListBackfillCandidates,
    {
      limit,
      imageIds,
    },
  );

  let migrated = 0;
  let failed = 0;
  let skipped = 0;
  const results: Array<Record<string, string | boolean | undefined>> = [];

  for (const image of images) {
    const hasStoredVariants =
      Boolean(image.previewStoragePath) &&
      Boolean(image.derivativeStoragePaths?.small) &&
      Boolean(image.derivativeStoragePaths?.medium) &&
      Boolean(image.derivativeStoragePaths?.large);

    const variantsNeedRefresh =
      Boolean(image.storagePath) &&
      (!hasStoredVariants ||
        image.imageUrl === image.derivativeUrls?.small ||
        image.imageUrl === image.derivativeUrls?.medium ||
        image.imageUrl === image.derivativeUrls?.large);

    const alreadyRustfs =
      image.storageProvider === "rustfs" ||
      (isRustfsUrl(image.imageUrl) &&
        (!image.previewUrl || isRustfsUrl(image.previewUrl)));

    if (alreadyRustfs && !(refreshVariants && variantsNeedRefresh)) {
      skipped += 1;
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: "already-rustfs",
        });
      }
      continue;
    }

    const mode = image.storagePath
      ? refreshVariants && variantsNeedRefresh
        ? "rebuild-variants"
        : "publish-existing"
      : pickBackfillSourceUrl(image)
        ? "re-upload-source"
        : "unrecoverable";

    if (dryRun) {
      if (mode === "unrecoverable") failed += 1;
      else migrated += 1;
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: mode,
          imageUrl: image.imageUrl,
          sourceType: image.sourceType,
        });
      }
      continue;
    }

    try {
      if (image.storagePath) {
        const published =
          refreshVariants && variantsNeedRefresh
            ? image.storageProvider === "rustfs" || isRustfsUrl(image.imageUrl)
              ? await ctx.runAction(
                  (internal as any).mediaStorage.persistExternalImageFromUrl,
                  {
                    sourceUrl:
                      pickMediaRepairSourceUrl(image) ?? image.imageUrl,
                    title: image.title,
                  },
                )
              : await ctx.runAction(
                  (internal as any).mediaStorage.reprocessStoredImagePaths,
                  {
                    storagePath: image.storagePath,
                    title: image.title,
                  },
                )
            : await ctx.runAction(
                (internal as any).mediaStorage.publishStoredImagePaths,
                {
                  storagePath: image.storagePath,
                  previewStoragePath: image.previewStoragePath,
                  derivativeStoragePaths: image.derivativeStoragePaths,
                },
              );
        await ctx.runMutation(
          internalApi.images.internalApplyNextcloudUpload,
          {
            imageId: image._id,
            imageUrl: published.imageUrl,
            previewUrl: published.previewUrl,
            storageProvider: published.bucket ? "rustfs" : undefined,
            storageBucket: published.bucket,
            storagePath: published.storagePath ?? image.storagePath,
            previewStoragePath:
              published.previewStoragePath ?? image.previewStoragePath,
            derivativeUrls: published.derivativeUrls,
            derivativeStoragePaths:
              published.derivativeStoragePaths ?? image.derivativeStoragePaths,
          },
        );
      } else {
        const sourceUrl = pickBackfillSourceUrl(image);
        if (!sourceUrl) {
          throw new Error("No recoverable source URL");
        }
        const persisted = await ctx.runAction(
          (internal as any).mediaStorage.persistExternalImageFromUrl,
          {
            sourceUrl,
            title: image.title,
          },
        );
        await ctx.runMutation(
          internalApi.images.internalApplyNextcloudUpload,
          {
            imageId: image._id,
            imageUrl: persisted.imageUrl,
            previewUrl: persisted.previewUrl,
            storageProvider: persisted.bucket ? "rustfs" : undefined,
            storageBucket: persisted.bucket,
            storagePath: persisted.storagePath,
            previewStoragePath: persisted.previewStoragePath,
            derivativeUrls: persisted.derivativeUrls,
            derivativeStoragePaths: persisted.derivativeStoragePaths,
          },
        );
      }

      migrated += 1;
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: mode,
        });
      }
    } catch (error: any) {
      failed += 1;
      await ctx.runMutation(
        internalApi.images.internalRecordNextcloudBackfillFailure,
        {
          imageId: image._id,
          error: error?.message || "Backfill failed",
        },
      );
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: "failed",
          error: error?.message || "Backfill failed",
        });
      }
    }
  }

  return new Response(
    JSON.stringify(
      {
        dryRun,
        refreshVariants,
        limit,
        scanned: images.length,
        migrated,
        failed,
        skipped,
        results,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});

export const remove = mutation({
  args: { id: v.id("images") },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get("images", args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    if (!(await canModifyImage(ctx, image, userId))) {
      throw new Error("Not authorized to delete this image");
    }

    await deleteImageRecord(ctx, image);

    return { success: true };
  },
});

export const removeMany = mutation({
  args: { ids: v.array(v.id("images")) },
  returns: v.object({ removed: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await isAdminUser(ctx, userId);
    let removed = 0;
    let skipped = 0;
    for (const id of args.ids) {
      const image = await ctx.db.get(id);
      if (!image || (image.uploadedBy !== userId && !isAdmin)) {
        skipped += 1;
        continue;
      }
      await deleteImageRecord(ctx, image);
      removed += 1;
    }

    return { removed, skipped };
  },
});

export const internalApplyNextcloudUpload = internalMutation({
  args: {
    imageId: v.id("images"),
    imageUrl: v.string(),
    previewUrl: v.optional(v.string()),
    storageProvider: v.optional(
      v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs")),
    ),
    storageBucket: v.optional(v.string()),
    storagePath: v.string(),
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const previous = await ctx.db.get(args.imageId);
    const storageProvider = storageProviderFromPayload(args);
    await ctx.db.patch("images", args.imageId, {
      imageUrl: args.imageUrl,
      previewUrl: args.previewUrl,
      storageProvider,
      storageBucket: args.storageBucket,
      storagePath: args.storagePath,
      previewStoragePath: args.previewStoragePath,
      colors: args.colors ?? [],
      derivativeUrls: args.derivativeUrls,
      derivativeStoragePaths: args.derivativeStoragePaths,
      nextcloudPersistStatus: "succeeded",
      nextcloudPersistError: undefined,
      storagePersistStatus: "succeeded",
      storagePersistError: undefined,
      storageMigration: previous
        ? {
            fromProvider: previous.storageProvider,
            fromImageUrl: previous.imageUrl,
            fromPreviewUrl: previous.previewUrl,
            migratedAt: Date.now(),
          }
        : undefined,
      storageId: undefined,
    });
    return null;
  },
});

export const internalMarkNextcloudPersistFailed = internalMutation({
  args: {
    imageId: v.id("images"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, {
      nextcloudPersistStatus: "failed",
      nextcloudPersistError: args.error,
      storagePersistStatus: "failed",
      storagePersistError: args.error,
      storageProvider: "convex",
    });
    return null;
  },
});

export const internalRecordNextcloudBackfillFailure = internalMutation({
  args: {
    imageId: v.id("images"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, {
      nextcloudPersistStatus: "failed",
      nextcloudPersistError: args.error,
      storagePersistStatus: "failed",
      storagePersistError: args.error,
    });
    return null;
  },
});

export const internalListBackfillCandidates = internalQuery({
  args: {
    limit: v.optional(v.number()),
    imageIds: v.optional(v.array(v.string())),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 1000));
    const selectedImages: any[] = [];
    for (const rawId of args.imageIds ?? []) {
      try {
        const image = await ctx.db.get(rawId as any);
        if (image) selectedImages.push(image);
      } catch {
        // Ignore malformed ids in operator-triggered backfills.
      }
    }
    const images =
      selectedImages.length > 0
        ? selectedImages.slice(0, limit)
        : await ctx.db.query("images").order("desc").take(limit);
    return images.map((image) => ({
      _id: image._id,
      title: image.title,
      status: image.status,
      imageUrl: image.imageUrl,
      previewUrl: image.previewUrl,
      derivativeUrls: image.derivativeUrls,
      sourceUrl: image.sourceUrl,
      sourceType: image.sourceType,
      storageProvider: image.storageProvider,
      storageBucket: image.storageBucket,
      storagePath: image.storagePath,
      previewStoragePath: image.previewStoragePath,
      derivativeStoragePaths: image.derivativeStoragePaths,
      nextcloudPersistStatus: image.nextcloudPersistStatus,
    }));
  },
});

export const internalGetMediaRepairPayload = internalQuery({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image || image.uploadedBy !== args.userId) return null;
    return {
      _id: image._id,
      title: image.title,
      imageUrl: image.imageUrl,
      previewUrl: image.previewUrl,
      derivativeUrls: image.derivativeUrls,
      sourceUrl: image.sourceUrl,
      storagePath: image.storagePath,
      storagePersistStatus: image.storagePersistStatus,
    };
  },
});

export const backfillNextcloudFailedUploads = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    scheduled: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const images = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceType"), "upload"),
          q.eq(q.field("storageProvider"), "convex"),
          q.neq(q.field("storageId"), undefined),
        ),
      )
      .take(limit);

    let scheduled = 0;
    for (const image of images) {
      if (triggerOrchestrationEnabled()) {
        await ctx.scheduler.runAfter(
          0,
          internalApi.triggerDispatch.dispatchFinalizeUpload,
          {
            imageId: image._id,
            userId,
          },
        );
      } else {
        await ctx.scheduler.runAfter(
          0,
          internalApi.mediaStorage.finalizeUploadedImage,
          {
            storageId: image.storageId!,
            imageId: image._id,
            userId,
            group: image.group,
            projectName: image.projectName,
            moodboardName: image.moodboardName,
            title: image.title,
            description: image.description,
            tags: image.tags,
            category: image.category,
            source: image.source,
            sref: image.sref,
            variationCount: image.variationCount,
            sourceType: image.sourceType,
          },
        );
      }
      scheduled += 1;
    }

    return { scheduled };
  },
});

export const quarantineBrokenNextcloudImages = mutation({
  args: {
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    scanned: v.number(),
    quarantined: v.number(),
    dryRun: v.boolean(),
    results: v.array(
      v.object({
        imageId: v.id("images"),
        title: v.string(),
        status: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.max(1, Math.min(args.limit ?? 200, 1000));
    const dryRun = Boolean(args.dryRun);
    const images = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .order("desc")
      .take(limit);

    const brokenImages = images.filter(
      (image) =>
        (image.status === "active" || image.status === undefined) &&
        hasCollapsedNextcloudVariants(image),
    );

    if (!dryRun) {
      for (const image of brokenImages) {
        await ctx.db.patch(image._id, {
          status: "broken",
          nextcloudPersistError:
            image.nextcloudPersistError ||
            "Quarantined because derivative URLs collapsed to the original Nextcloud asset.",
        });
      }
    }

    return {
      scanned: images.length,
      quarantined: brokenImages.length,
      dryRun,
      results: brokenImages.slice(0, 100).map((image) => ({
        imageId: image._id,
        title: image.title,
        status: dryRun ? "would-quarantine" : "quarantined",
      })),
    };
  },
});

export const quarantineBrokenNextcloudHttp = httpAction(
  async (ctx, request) => {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const apiKey = process.env.INGEST_API_KEY;
    const token = readBearerToken(request);
    if (!apiKey || token !== apiKey) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 200), 1000));
    const dryRun = Boolean(body?.dryRun);
    const images = await ctx.runQuery(
      internalApi.images.internalListBackfillCandidates,
      {
        limit,
      },
    );

    const brokenImages = images.filter(
      (image: any) =>
        (image.status === "active" || image.status === undefined) &&
        hasCollapsedNextcloudVariants(image),
    );

    if (!dryRun) {
      for (const image of brokenImages) {
        await ctx.runMutation(
          internalApi.images.internalQuarantineBrokenImage,
          {
            imageId: image._id,
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        scanned: images.length,
        quarantined: brokenImages.length,
        dryRun,
        results: brokenImages.slice(0, 100).map((image: any) => ({
          imageId: image._id,
          title: image.title,
          status: dryRun ? "would-quarantine" : "quarantined",
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
);

export const internalQuarantineBrokenImage = internalMutation({
  args: {
    imageId: v.id("images"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;

    await ctx.db.patch(args.imageId, {
      status: "broken",
      nextcloudPersistError:
        image.nextcloudPersistError ||
        "Quarantined because derivative URLs collapsed to the original Nextcloud asset.",
    });
    return null;
  },
});
