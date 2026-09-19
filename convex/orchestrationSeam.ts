/**
 * HTTP callback seam shared by Convex `http.ts` and Trigger workers.
 * Keep this file free of Node APIs — HTTP actions and mutations import it.
 */

export const ORCHESTRATION_LEASE_MS = 15 * 60 * 1000;
export const ORCHESTRATION_DEDUPE_MS = 60 * 60 * 1000;

/** Convex HTTP paths registered in `convex/http.ts`. */
export const ORCHESTRATION_HTTP_SEAM = {
  imageRefresh: "/orchestration/image-refresh",
  mediaFinalize: "/orchestration/media-finalize",
  externalIngest: "/orchestration/external-ingest",
  mediaRepair: "/orchestration/media-repair",
  generateVariations: "/orchestration/generate-variations",
  generateVariationsPrepare: "/orchestration/generate-variations/prepare",
  generateVariationsPersist: "/orchestration/generate-variations/persist",
  generateVariationsComplete: "/orchestration/generate-variations/complete",
} as const;

/**
 * Path segments Trigger workers POST to `${PINDECK_CONVEX_SITE_URL}/orchestration/${path}`.
 * Keep in lockstep with ORCHESTRATION_HTTP_SEAM.
 */
export const ORCHESTRATION_WORKER_PATHS = {
  imageRefresh: "image-refresh",
  mediaFinalize: "media-finalize",
  externalIngest: "external-ingest",
  mediaRepair: "media-repair",
  generateVariations: "generate-variations",
  generateVariationsPrepare: "generate-variations/prepare",
  generateVariationsPersist: "generate-variations/persist",
  generateVariationsComplete: "generate-variations/complete",
} as const;

export type OrchestrationWorkerPath =
  (typeof ORCHESTRATION_WORKER_PATHS)[keyof typeof ORCHESTRATION_WORKER_PATHS];

export function orchestrationWorkerUrl(
  siteUrl: string,
  workerPath: OrchestrationWorkerPath,
) {
  return `${siteUrl.replace(/\/+$/, "")}/orchestration/${workerPath}`;
}
