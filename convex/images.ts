/**
 * Public `api.images.*` surface (`images:fn` on the wire).
 *
 * Implementations live under `convex/images/`. This root module exists so
 * clients keep calling `api.images.list` after the V1S-84 split (nested files
 * alone register `images/library:list`, not `images:list`).
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
} from "./images/library";

export {
  createExternal,
  ingestExternal,
  ingestExternalHttp,
} from "./images/ingest";

export {
  internalListDiscordQueue,
  internalModerateDiscordImage,
  discordQueueHttp,
  discordModerateHttp,
  getPendingImages,
  approveImage,
  rejectImage,
} from "./images/moderation";

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
} from "./images/lifecycle";

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
} from "./images/uploads";

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
} from "./images/analysis";

export {
  backfillGenerationsFromAiImages,
  internalSaveGeneratedImages,
  internalGetGeneratedArtifactByKey,
} from "./images/generation";
