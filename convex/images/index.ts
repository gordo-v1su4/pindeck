/**
 * Public Convex API surface for images (`api.images.*`).
 *
 * Implementations live in sibling modules. This file only re-exports so
 * file-based routing stays at api.images / internal.images (a function
 * defined in convex/images/library.ts would otherwise become
 * api.images.library.*).
 */

export {
  list,
  libraryAggregations,
  search,
  getById,
  toggleLike,
  incrementViews,
  GROUPS,
  getGroups,
  getCategories,
  getLineage,
  setProjectRowOrder,
} from "./library";

export {
  createExternal,
  ingestExternal,
  ingestExternalHttp,
} from "./ingest";

export {
  internalListDiscordQueue,
  internalModerateDiscordImage,
  discordQueueHttp,
  discordModerateHttp,
  getPendingImages,
  approveImage,
  rejectImage,
} from "./moderation";

export {
  enqueueMediaRepair,
  enqueueMediaRepairMany,
  internalRepairImageMedia,
  backfillNextcloudHttp,
  remove,
  removeMany,
  internalApplyNextcloudUpload,
  internalMarkNextcloudPersistFailed,
  internalRecordNextcloudBackfillFailure,
  internalListBackfillCandidates,
  internalGetMediaRepairPayload,
  backfillNextcloudFailedUploads,
  quarantineBrokenNextcloudImages,
  quarantineBrokenNextcloudHttp,
  internalQuarantineBrokenImage,
} from "./lifecycle";

export {
  create,
  internalCreate,
  internalGenerateUploadUrl,
  generateUploadUrl,
  uploadMultiple,
  getDraftImages,
  finalizeUploads,
  getProcessingImages,
  clearMyStaleProcessingImages,
  internalGetUploadFinalizePayload,
} from "./uploads";

export {
  enqueueCinematicMetadataBackfill,
  enqueueMetadataRefresh,
  internalRefreshMetadataAfterPalette,
  internalGetImageForAnalysis,
  internalCanModifyImage,
  internalUpdateAnalysis,
  internalSetAiStatus,
  internalGetMetadataRefreshPayload,
  updateAnalysis,
  updateImageMetadata,
  setAiStatus,
} from "./analysis";

export {
  backfillGenerationsFromAiImages,
  internalSaveGeneratedImages,
  internalGetGeneratedArtifactByKey,
} from "./generation";
