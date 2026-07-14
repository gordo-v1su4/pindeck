import { fal } from "@fal-ai/client";
import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk";

import {
  pindeckGenerationOrchestrationQueue,
  pindeckGenerationQueue,
} from "./queues";
import { safeProviderMessage } from "./workMetadata";

export type PindeckVariationGenerationPayload = {
  imageId: string;
  userId: string;
  dispatchId: string;
  variationCount: number;
  modificationMode: string;
  variationDetail?: string;
  aspectRatio?: string;
};

type PreparedVariationGeneration = {
  ok: true;
  imageUrl: string;
  prompts: string[];
  aspectRatio: string;
  title: string;
  description: string;
};

type VariationItemPayload = {
  imageId: string;
  userId: string;
  dispatchId: string;
  parentRunId: string;
  itemIndex: number;
  totalItems: number;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  title: string;
  description: string;
};

export const pindeckVariationItemTask = task({
  id: "pindeck-generate-variation-item",
  queue: pindeckGenerationQueue,
  maxDuration: 540,
  // Retrying after FAL accepts a paid render can create a duplicate charge.
  retry: { maxAttempts: 1 },
  run: async (payload: VariationItemPayload, { ctx }) => {
    setWorkMetadata({
      stage: "provider-queued",
      stageLabel: `Variation ${payload.itemIndex + 1} of ${payload.totalItems}`,
      progressMode: "provider",
      imageId: payload.imageId,
      parentRunId: payload.parentRunId,
      itemIndex: payload.itemIndex,
      parentTotalItems: payload.totalItems,
      totalItems: 1,
      processedItems: 0,
      completedItems: 0,
      failedItems: 0,
      providerStatus: "QUEUED",
    });

    fal.config({ credentials: requireEnv("FAL_KEY") });
    const result = await logger.trace(
      "Generate variation with FAL",
      async (span) => {
        span.setAttribute("pindeck.imageId", payload.imageId);
        span.setAttribute("pindeck.itemIndex", payload.itemIndex);
        return await fal.subscribe("fal-ai/nano-banana-pro/edit", {
          input: {
            prompt: payload.prompt,
            image_urls: [payload.imageUrl],
            num_images: 1,
            aspect_ratio: payload.aspectRatio as
              | "16:9"
              | "9:16"
              | "1:1"
              | "4:3"
              | "3:4"
              | "auto",
            resolution: "2K",
            output_format: "png",
          },
          logs: true,
          onQueueUpdate: (update) => {
            const latestMessage = update.logs?.at(-1)?.message;
            metadata
              .set(
                "stage",
                update.status === "IN_PROGRESS"
                  ? "provider-running"
                  : "provider-queued",
              )
              .set(
                "stageLabel",
                update.status === "IN_PROGRESS"
                  ? "FAL is rendering"
                  : "Waiting for FAL",
              )
              .set("providerStatus", update.status);
            const safeMessage = safeProviderMessage(latestMessage);
            if (safeMessage) metadata.set("providerMessage", safeMessage);
          },
        });
      },
    );

    const generatedUrl = result.data?.images?.[0]?.url;
    if (!generatedUrl) {
      throw new AbortTaskRunError(
        "FAL completed without returning an image URL",
      );
    }

    metadata
      .set("stage", "persisting")
      .set("stageLabel", "Saving to Pindeck storage");
    const persisted = (await logger.trace(
      "Persist generated variation",
      async () =>
        invokeConvex("generate-variations/persist", {
          imageId: payload.imageId,
          userId: payload.userId,
          dispatchId: payload.dispatchId,
          parentRunId: payload.parentRunId,
          childRunId: ctx.run.id,
          itemIndex: payload.itemIndex,
          sourceUrl: generatedUrl,
          title: payload.title,
          description: payload.description,
        }),
    )) as { ok: true; imageId: string; imageUrl: string };

    metadata
      .set("stage", "completed")
      .set("stageLabel", "Variation saved")
      .set("progressMode", "exact")
      .set("processedItems", 1)
      .set("completedItems", 1)
      .set("providerStatus", "COMPLETED");
    logger.info("Pindeck variation item completed", {
      triggerRunId: ctx.run.id,
      parentRunId: payload.parentRunId,
      imageId: payload.imageId,
      generatedImageId: persisted.imageId,
      itemIndex: payload.itemIndex,
    });
    return {
      ok: true as const,
      imageId: persisted.imageId,
      imageUrl: persisted.imageUrl,
    };
  },
});

export const pindeckVariationGenerationTask = task({
  id: "pindeck-generate-variations",
  queue: pindeckGenerationOrchestrationQueue,
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async (payload: PindeckVariationGenerationPayload, { ctx }) => {
    setWorkMetadata({
      stage: "preparing",
      stageLabel: "Preparing variation plan",
      progressMode: "exact",
      imageId: payload.imageId,
      totalItems: payload.variationCount,
      processedItems: 0,
      completedItems: 0,
      failedItems: 0,
    });

    const prepared = (await invokeConvex("generate-variations/prepare", {
      ...payload,
      runId: ctx.run.id,
    })) as PreparedVariationGeneration;

    const totalItems = prepared.prompts.length;
    metadata
      .set("stage", "generating")
      .set(
        "stageLabel",
        totalItems ? "Rendering variations" : "No variations requested",
      )
      .set("totalItems", totalItems);

    let generated = 0;
    let failed = 0;
    for (let itemIndex = 0; itemIndex < totalItems; itemIndex += 1) {
      metadata
        .set("activeItem", itemIndex + 1)
        .set("stageLabel", `Rendering ${itemIndex + 1} of ${totalItems}`);
      const result = await pindeckVariationItemTask.triggerAndWait(
        {
          imageId: payload.imageId,
          userId: payload.userId,
          dispatchId: payload.dispatchId,
          parentRunId: ctx.run.id,
          itemIndex,
          totalItems,
          prompt: prepared.prompts[itemIndex],
          imageUrl: prepared.imageUrl,
          aspectRatio: prepared.aspectRatio,
          title: prepared.title,
          description: prepared.description,
        },
        {
          idempotencyKey: `${payload.dispatchId}:variation:${itemIndex}`,
          idempotencyKeyTTL: "1h",
          maxAttempts: 1,
          tags: [
            "pindeck",
            "generation-item",
            `image:${payload.imageId}`,
            `user:${payload.userId}`,
            `parent:${ctx.run.id}`,
          ],
          metadata: {
            stage: "queued",
            stageLabel: `Variation ${itemIndex + 1} queued`,
            progressMode: "provider",
            imageId: payload.imageId,
            parentRunId: ctx.run.id,
            itemIndex,
            parentTotalItems: totalItems,
            totalItems: 1,
            processedItems: 0,
            completedItems: 0,
            failedItems: 0,
          },
        },
      );
      if (result.ok) {
        generated += 1;
      } else {
        failed += 1;
        logger.warn("Pindeck variation item failed", {
          parentRunId: ctx.run.id,
          imageId: payload.imageId,
          itemIndex,
          error: result.error,
        });
      }
      metadata
        .set("processedItems", itemIndex + 1)
        .set("completedItems", generated)
        .set("failedItems", failed);
    }

    metadata
      .set("stage", "finalizing")
      .set("stageLabel", "Finalizing generation");
    const completion = (await invokeConvex("generate-variations/complete", {
      imageId: payload.imageId,
      userId: payload.userId,
      dispatchId: payload.dispatchId,
      runId: ctx.run.id,
      requested: totalItems,
      generated,
      failed,
    })) as { ok: true; requested: number; generated: number; failed: number };

    metadata
      .set("stage", "completed")
      .set(
        "stageLabel",
        failed ? "Completed with partial failures" : "All variations saved",
      )
      .set("processedItems", totalItems)
      .set("completedItems", generated)
      .set("failedItems", failed);
    logger.info("Pindeck variation generation completed", {
      triggerRunId: ctx.run.id,
      imageId: payload.imageId,
      requested: totalItems,
      generated,
      failed,
      modificationMode: payload.modificationMode,
    });
    return completion;
  },
});

function setWorkMetadata(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) metadata.set(key, value);
}

async function invokeConvex(path: string, body: Record<string, unknown>) {
  const siteUrl = requireEnv("PINDECK_CONVEX_SITE_URL").replace(/\/+$/, "");
  const token = requireEnv("PINDECK_ORCHESTRATION_TOKEN");
  const response = await fetch(`${siteUrl}/orchestration/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(540_000),
  });
  const text = await response.text();
  if (!response.ok) {
    const message = `Pindeck ${path} failed (${response.status}): ${text.slice(0, 500)}`;
    if (response.status >= 400 && response.status < 500)
      throw new AbortTaskRunError(message);
    throw new Error(message);
  }
  return JSON.parse(text) as unknown;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
