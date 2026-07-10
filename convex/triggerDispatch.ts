"use node";

import { createHash } from "node:crypto";
import { runs, tasks } from "@trigger.dev/sdk/v3";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const dispatchImageMetadataRefresh = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    forcePalette: v.optional(v.boolean()),
    runMetadata: v.optional(v.boolean()),
  },
  returns: v.object({ runId: v.string() }),
  handler: async (ctx, args) => {
    requireTriggerConfig();
    const idempotencyKey = createImageRefreshIdempotencyKey(args);
    try {
      const handle = await tasks.trigger("pindeck-image-refresh", args, {
        idempotencyKey,
        idempotencyKeyTTL: "5m",
        maxAttempts: 2,
        tags: ["pindeck", "image-refresh", "analysis"],
      });
      await reconcileReusedRun(ctx, args.imageId, handle.id);
      return { runId: handle.id };
    } catch (error) {
      await ctx.runMutation((internal as any).images.internalSetAiStatus, {
        imageId: args.imageId,
        status: "failed",
      });
      throw error;
    }
  },
});

async function reconcileReusedRun(ctx: any, imageId: string, runId: string) {
  try {
    const run = await runs.retrieve(runId);
    const status = aiStatusForTerminalTriggerRun(run.status);
    if (!status) return;
    await ctx.runMutation((internal as any).images.internalSetAiStatus, {
      imageId,
      status,
    });
  } catch (error) {
    // Dispatch succeeded. A transient read-after-write failure must not mark a
    // newly queued run failed; the task callback remains authoritative.
    console.warn("Unable to reconcile Pindeck Trigger run state", { runId, error });
  }
}

export function aiStatusForTerminalTriggerRun(status: string) {
  if (status === "COMPLETED") return "completed";
  if (["CANCELED", "FAILED", "CRASHED", "SYSTEM_FAILURE", "EXPIRED", "TIMED_OUT"].includes(status)) {
    return "failed";
  }
  return undefined;
}

export function createImageRefreshIdempotencyKey(args: {
  imageId: string;
  userId: string;
  forcePalette?: boolean;
  runMetadata?: boolean;
}) {
  const digest = createHash("sha256")
    .update(`${args.userId}:${args.imageId}:${args.forcePalette === true}:${args.runMetadata !== false}`)
    .digest("hex");
  return `pindeck-image-refresh:${digest}`;
}

function requireTriggerConfig() {
  if (!process.env.TRIGGER_API_URL?.trim() || !process.env.TRIGGER_SECRET_KEY?.trim()) {
    throw new Error("Pindeck Trigger.dev dispatch is not configured");
  }
}
