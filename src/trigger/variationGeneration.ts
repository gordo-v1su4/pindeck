import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk";

import { pindeckGenerationQueue } from "./queues";

export type PindeckVariationGenerationPayload = {
  imageId: string;
  userId: string;
  dispatchId: string;
  variationCount: number;
  modificationMode: string;
  variationDetail?: string;
  aspectRatio?: string;
};

export const pindeckVariationGenerationTask = task({
  id: "pindeck-generate-variations",
  queue: pindeckGenerationQueue,
  // Convex HTTP actions have a 10-minute ceiling, so keep this callback below
  // that boundary and leave enough time for Trigger to record the response.
  maxDuration: 540,
  // A retry after FAL accepts work could create duplicate paid renders.
  retry: { maxAttempts: 1 },
  run: async (payload: PindeckVariationGenerationPayload, { ctx }) => {
    metadata
      .set("stage", "generating")
      .set("imageId", payload.imageId)
      .set("variationCount", payload.variationCount);
    const siteUrl = requireEnv("PINDECK_CONVEX_SITE_URL").replace(/\/+$/, "");
    const token = requireEnv("PINDECK_ORCHESTRATION_TOKEN");
    const response = await fetch(`${siteUrl}/orchestration/generate-variations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, runId: ctx.run.id }),
      signal: AbortSignal.timeout(500_000),
    });
    const text = await response.text();
    if (!response.ok) {
      const message = `Pindeck variation generation failed (${response.status}): ${text.slice(0, 500)}`;
      if (response.status >= 400 && response.status < 500) {
        throw new AbortTaskRunError(message);
      }
      throw new Error(message);
    }
    const result = JSON.parse(text) as { ok: boolean; requested: number; generated: number };
    metadata.set("stage", "completed").set("generated", result.generated);
    logger.info("Pindeck variation generation completed", {
      triggerRunId: ctx.run.id,
      imageId: payload.imageId,
      variationCount: payload.variationCount,
      modificationMode: payload.modificationMode,
    });
    return result;
  },
});

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
