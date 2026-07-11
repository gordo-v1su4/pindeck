import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk";

import { pindeckMediaQueue } from "./queues";

export type PindeckOwnedImagePayload = {
  imageId: string;
  userId: string;
  dispatchId: string;
};

export const pindeckFinalizeUploadTask = task({
  id: "pindeck-finalize-upload",
  queue: pindeckMediaQueue,
  maxDuration: 600,
  retry: mediaRetry(3),
  run: async (payload: PindeckOwnedImagePayload, { ctx }) => {
    metadata.set("stage", "persisting").set("imageId", payload.imageId);
    const result = await invokeConvex("media-finalize", payload, ctx.run.id);
    logger.info("Pindeck upload finalized", {
      triggerRunId: ctx.run.id,
      imageId: payload.imageId,
      imageUrl: result.imageUrl,
    });
    metadata.set("stage", "completed");
    return result;
  },
});

export const pindeckExternalIngestTask = task({
  id: "pindeck-external-ingest",
  queue: pindeckMediaQueue,
  maxDuration: 600,
  retry: mediaRetry(3),
  run: async (payload: PindeckOwnedImagePayload, { ctx }) => {
    metadata.set("stage", "ingesting").set("imageId", payload.imageId);
    const result = await invokeConvex("external-ingest", payload, ctx.run.id);
    logger.info("Pindeck external ingest persisted", {
      triggerRunId: ctx.run.id,
      imageId: payload.imageId,
      imageUrl: result.imageUrl,
    });
    metadata.set("stage", "completed");
    return result;
  },
});

export const pindeckMediaRepairTask = task({
  id: "pindeck-media-repair",
  queue: pindeckMediaQueue,
  maxDuration: 600,
  retry: mediaRetry(2),
  run: async (payload: PindeckOwnedImagePayload, { ctx }) => {
    metadata.set("stage", "repairing").set("imageId", payload.imageId);
    const result = await invokeConvex("media-repair", payload, ctx.run.id);
    logger.info("Pindeck media repair completed", {
      triggerRunId: ctx.run.id,
      imageId: payload.imageId,
      imageUrl: result.imageUrl,
    });
    metadata.set("stage", "completed");
    return result;
  },
});

function mediaRetry(maxAttempts: number) {
  return {
    maxAttempts,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 20_000,
    randomize: true,
  };
}

async function invokeConvex(path: string, payload: PindeckOwnedImagePayload, runId: string) {
  const siteUrl = requireEnv("PINDECK_CONVEX_SITE_URL").replace(/\/+$/, "");
  const token = requireEnv("PINDECK_ORCHESTRATION_TOKEN");
  const response = await fetch(`${siteUrl}/orchestration/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, runId }),
    signal: AbortSignal.timeout(540_000),
  });
  const text = await response.text();
  if (!response.ok) {
    const message = `Pindeck ${path} failed (${response.status}): ${text.slice(0, 500)}`;
    if (response.status >= 400 && response.status < 500) {
      throw new AbortTaskRunError(message);
    }
    throw new Error(message);
  }
  return JSON.parse(text) as { ok: true; imageUrl?: string; alreadyCompleted?: boolean };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
