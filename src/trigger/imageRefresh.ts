import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk";

import { pindeckAnalysisQueue } from "./queues";

export type PindeckImageRefreshPayload = {
  imageId: string;
  userId: string;
  dispatchId: string;
  forcePalette?: boolean;
  runMetadata?: boolean;
};

export const pindeckImageRefreshTask = task({
  id: "pindeck-image-refresh",
  queue: pindeckAnalysisQueue,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 15_000,
    randomize: true,
  },
  run: async (payload: PindeckImageRefreshPayload, { ctx }) => {
    metadata
      .set("stage", "analysis")
      .set("stageLabel", "Analyzing image metadata")
      .set("progressMode", "indeterminate")
      .set("imageId", payload.imageId);
    const siteUrl = requireEnv("PINDECK_CONVEX_SITE_URL").replace(/\/+$/, "");
    const token = requireEnv("PINDECK_ORCHESTRATION_TOKEN");
    const response = await logger.trace(
      "Analyze image in Convex",
      async (span) => {
        span.setAttribute("pindeck.imageId", payload.imageId);
        return await fetch(`${siteUrl}/orchestration/image-refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, runId: ctx.run.id }),
          signal: AbortSignal.timeout(540_000),
        });
      },
    );
    const text = await response.text();
    if (!response.ok) {
      const message = `Pindeck image refresh failed (${response.status}): ${text.slice(0, 500)}`;
      if (response.status >= 400 && response.status < 500) {
        throw new AbortTaskRunError(message);
      }
      throw new Error(message);
    }

    const result = JSON.parse(text) as {
      ok: boolean;
      paletteOk: boolean;
      metadataRan: boolean;
    };
    logger.info("Pindeck image refresh completed", {
      triggerRunId: ctx.run.id,
      imageId: payload.imageId,
      paletteOk: result.paletteOk,
      metadataRan: result.metadataRan,
    });
    metadata
      .set("stage", "completed")
      .set("stageLabel", "Image analysis complete")
      .set("paletteOk", result.paletteOk);
    return result;
  },
});

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
