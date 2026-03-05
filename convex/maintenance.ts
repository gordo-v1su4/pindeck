import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const FULL_WIPE_CONFIRMATION = "DELETE_ALL_IMAGES_AND_STORAGE";
const ORPHAN_WIPE_CONFIRMATION = "DELETE_ORPHANED_STORAGE_FILES";
const IMAGE_DOMAIN_RESET_CONFIRMATION = "RESET_ALL_IMAGE_DOMAIN_DATA";
const internalApi = internal as any;

function isStorageId(id: Id<"_storage"> | undefined): id is Id<"_storage"> {
  return id !== undefined;
}

export const listImageStorageIds = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    totalImagesScanned: v.number(),
    storageIds: v.array(v.id("_storage")),
  }),
  handler: async (ctx, args) => {
    const images = await ctx.db.query("images").collect();
    const storageIds = images.map((image) => image.storageId).filter(isStorageId);
    const uniqueStorageIds: Id<"_storage">[] = [...new Set(storageIds)];

    const limited =
      args.limit && args.limit > 0
        ? uniqueStorageIds.slice(0, args.limit)
        : uniqueStorageIds;

    return {
      totalImagesScanned: images.length,
      storageIds: limited,
    };
  },
});

export const deleteStorageFiles = internalMutation({
  args: {
    fileIds: v.array(v.id("_storage")),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    requested: v.number(),
    uniqueRequested: v.number(),
    deleted: v.number(),
    failed: v.number(),
    failedIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const uniqueFileIds: Id<"_storage">[] = [...new Set(args.fileIds)];

    if (dryRun) {
      return {
        dryRun,
        requested: args.fileIds.length,
        uniqueRequested: uniqueFileIds.length,
        deleted: uniqueFileIds.length,
        failed: 0,
        failedIds: [],
      };
    }

    let deleted = 0;
    const failedIds: string[] = [];

    for (const fileId of uniqueFileIds) {
      try {
        await ctx.storage.delete(fileId);
        deleted += 1;
      } catch (error) {
        console.warn("Failed to delete storage file", fileId, error);
        failedIds.push(String(fileId));
      }
    }

    return {
      dryRun,
      requested: args.fileIds.length,
      uniqueRequested: uniqueFileIds.length,
      deleted,
      failed: failedIds.length,
      failedIds,
    };
  },
});

export const wipeAllImagesAndStorage = internalMutation({
  args: {
    confirm: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    imagesFound: v.number(),
    uniqueStorageFilesFound: v.number(),
    imagesDeleted: v.number(),
    storageDeleted: v.number(),
    storageFailed: v.number(),
    storageFailedIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    if (args.confirm !== FULL_WIPE_CONFIRMATION) {
      throw new Error(
        `Confirmation mismatch. Pass confirm=\"${FULL_WIPE_CONFIRMATION}\" to proceed.`
      );
    }

    const dryRun = args.dryRun ?? false;

    const images = await ctx.db.query("images").collect();
    const storageIds = images.map((image) => image.storageId).filter(isStorageId);
    const uniqueStorageIds: Id<"_storage">[] = [...new Set(storageIds)];

    if (dryRun) {
      return {
        dryRun,
        imagesFound: images.length,
        uniqueStorageFilesFound: uniqueStorageIds.length,
        imagesDeleted: 0,
        storageDeleted: 0,
        storageFailed: 0,
        storageFailedIds: [],
      };
    }

    let storageDeleted = 0;
    const storageFailedIds: string[] = [];

    for (const storageId of uniqueStorageIds) {
      try {
        await ctx.storage.delete(storageId);
        storageDeleted += 1;
      } catch (error) {
        console.warn("Failed to delete storage file during full wipe", storageId, error);
        storageFailedIds.push(String(storageId));
      }
    }

    let imagesDeleted = 0;
    for (const image of images) {
      await ctx.db.delete(image._id);
      imagesDeleted += 1;
    }

    return {
      dryRun,
      imagesFound: images.length,
      uniqueStorageFilesFound: uniqueStorageIds.length,
      imagesDeleted,
      storageDeleted,
      storageFailed: storageFailedIds.length,
      storageFailedIds,
    };
  },
});

export const listOrphanedStorageFiles = internalQuery({
  args: {
    limit: v.optional(v.number()),
    onlyImages: v.optional(v.boolean()),
  },
  returns: v.object({
    scannedImageRows: v.number(),
    scannedStorageFiles: v.number(),
    referencedStorageFiles: v.number(),
    orphanCandidates: v.number(),
    orphanIds: v.array(v.id("_storage")),
  }),
  handler: async (ctx, args) => {
    const onlyImages = args.onlyImages ?? true;

    const images = await ctx.db.query("images").collect();
    const referencedStorageIds = new Set(
      images.map((image) => image.storageId).filter(isStorageId)
    );

    const allStorageFiles = await ctx.db.system.query("_storage").collect();
    const targetStorageFiles = onlyImages
      ? allStorageFiles.filter((file) =>
          String(file.contentType ?? "").toLowerCase().startsWith("image/")
        )
      : allStorageFiles;

    const orphanIds = targetStorageFiles
      .map((file) => file._id)
      .filter((id) => !referencedStorageIds.has(id));

    const limitedOrphanIds =
      args.limit && args.limit > 0 ? orphanIds.slice(0, args.limit) : orphanIds;

    const referencedInTarget = targetStorageFiles.filter((file) =>
      referencedStorageIds.has(file._id)
    ).length;

    return {
      scannedImageRows: images.length,
      scannedStorageFiles: targetStorageFiles.length,
      referencedStorageFiles: referencedInTarget,
      orphanCandidates: orphanIds.length,
      orphanIds: limitedOrphanIds,
    };
  },
});

export const deleteOrphanedStorageFiles = internalMutation({
  args: {
    confirm: v.string(),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    onlyImages: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    scannedImageRows: v.number(),
    scannedStorageFiles: v.number(),
    referencedStorageFiles: v.number(),
    orphanCandidates: v.number(),
    processed: v.number(),
    deleted: v.number(),
    failed: v.number(),
    orphanIds: v.array(v.id("_storage")),
    failedIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    if (args.confirm !== ORPHAN_WIPE_CONFIRMATION) {
      throw new Error(
        `Confirmation mismatch. Pass confirm=\"${ORPHAN_WIPE_CONFIRMATION}\" to proceed.`
      );
    }

    const dryRun = args.dryRun ?? false;
    const onlyImages = args.onlyImages ?? true;

    const images = await ctx.db.query("images").collect();
    const referencedStorageIds = new Set(
      images.map((image) => image.storageId).filter(isStorageId)
    );

    const allStorageFiles = await ctx.db.system.query("_storage").collect();
    const targetStorageFiles = onlyImages
      ? allStorageFiles.filter((file) =>
          String(file.contentType ?? "").toLowerCase().startsWith("image/")
        )
      : allStorageFiles;

    const orphanIds = targetStorageFiles
      .map((file) => file._id)
      .filter((id) => !referencedStorageIds.has(id));

    const selectedOrphanIds =
      args.limit && args.limit > 0 ? orphanIds.slice(0, args.limit) : orphanIds;

    const referencedInTarget = targetStorageFiles.filter((file) =>
      referencedStorageIds.has(file._id)
    ).length;

    if (dryRun) {
      return {
        dryRun,
        scannedImageRows: images.length,
        scannedStorageFiles: targetStorageFiles.length,
        referencedStorageFiles: referencedInTarget,
        orphanCandidates: orphanIds.length,
        processed: selectedOrphanIds.length,
        deleted: 0,
        failed: 0,
        orphanIds: selectedOrphanIds,
        failedIds: [],
      };
    }

    let deleted = 0;
    const failedIds: string[] = [];
    for (const storageId of selectedOrphanIds) {
      try {
        await ctx.storage.delete(storageId);
        deleted += 1;
      } catch (error) {
        console.warn("Failed to delete orphaned storage file", storageId, error);
        failedIds.push(String(storageId));
      }
    }

    return {
      dryRun,
      scannedImageRows: images.length,
      scannedStorageFiles: targetStorageFiles.length,
      referencedStorageFiles: referencedInTarget,
      orphanCandidates: orphanIds.length,
      processed: selectedOrphanIds.length,
      deleted,
      failed: failedIds.length,
      orphanIds: selectedOrphanIds,
      failedIds,
    };
  },
});

export const resetImageDomainData = mutation({
  args: {
    confirm: v.string(),
  },
  returns: v.object({
    imagesDeleted: v.number(),
    convexStorageDeleted: v.number(),
    convexStorageFailed: v.number(),
    nextcloudCleanupScheduled: v.number(),
    collectionsCleared: v.number(),
    likesDeleted: v.number(),
    generationsDeleted: v.number(),
    storyboardsDeleted: v.number(),
    decksDeleted: v.number(),
    importBatchesDeleted: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.confirm !== IMAGE_DOMAIN_RESET_CONFIRMATION) {
      throw new Error(
        `Confirmation mismatch. Pass confirm="${IMAGE_DOMAIN_RESET_CONFIRMATION}" to proceed.`
      );
    }

    const images = await ctx.db.query("images").collect();
    const nextcloudPaths = [
      ...new Set(
        images
          .flatMap((img) => [img.storagePath, (img as any).previewStoragePath])
          .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      ),
    ];

    const storageIds = [...new Set(images.map((img) => img.storageId).filter(isStorageId))];

    let convexStorageDeleted = 0;
    let convexStorageFailed = 0;
    for (const storageId of storageIds) {
      try {
        await ctx.storage.delete(storageId);
        convexStorageDeleted += 1;
      } catch {
        convexStorageFailed += 1;
      }
    }

    let imagesDeleted = 0;
    for (const image of images) {
      await ctx.db.delete(image._id);
      imagesDeleted += 1;
    }

    const collections = await ctx.db.query("collections").collect();
    for (const collection of collections) {
      await ctx.db.patch(collection._id, { imageIds: [] });
    }

    const likes = await ctx.db.query("likes").collect();
    for (const like of likes) await ctx.db.delete(like._id);

    const generations = await ctx.db.query("generations").collect();
    for (const generation of generations) await ctx.db.delete(generation._id);

    const storyboards = await ctx.db.query("storyboards").collect();
    for (const storyboard of storyboards) await ctx.db.delete(storyboard._id);

    const decks = await ctx.db.query("decks").collect();
    for (const deck of decks) await ctx.db.delete(deck._id);

    const importBatches = await ctx.db.query("importBatches").collect();
    for (const batch of importBatches) await ctx.db.delete(batch._id);

    if (nextcloudPaths.length > 0) {
      await ctx.scheduler.runAfter(0, internalApi.mediaStorage.cleanupNextcloudPaths, {
        paths: nextcloudPaths,
      });
    }

    return {
      imagesDeleted,
      convexStorageDeleted,
      convexStorageFailed,
      nextcloudCleanupScheduled: nextcloudPaths.length,
      collectionsCleared: collections.length,
      likesDeleted: likes.length,
      generationsDeleted: generations.length,
      storyboardsDeleted: storyboards.length,
      decksDeleted: decks.length,
      importBatchesDeleted: importBatches.length,
    };
  },
});
