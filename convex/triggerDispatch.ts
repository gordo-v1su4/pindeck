"use node";

import { randomUUID } from "node:crypto";
import { auth as triggerAuth, runs, tasks } from "@trigger.dev/sdk";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import {
  aiStatusForTerminalTriggerRun,
  createDispatchId,
  createImageRefreshIdempotencyKey,
  createOwnedImageTaskIdempotencyKey,
  createVariationGenerationIdempotencyKey,
  orchestrationStatusForTerminalTriggerRun,
  workActivityReadScopeForUser,
  workActivityTagForUser,
} from "./orchestrationCore";

export {
  aiStatusForTerminalTriggerRun,
  createDispatchId,
  createImageRefreshIdempotencyKey,
  createOwnedImageTaskIdempotencyKey,
  createVariationGenerationIdempotencyKey,
  orchestrationStatusForTerminalTriggerRun,
  workActivityReadScopeForUser,
  workActivityTagForUser,
} from "./orchestrationCore";

export const createWorkActivityToken = action({
  args: {},
  returns: v.object({
    accessToken: v.string(),
    baseURL: v.string(),
    tag: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    requireTriggerConfig();
    const tag = workActivityTagForUser(userId);
    const accessToken = await triggerAuth.createPublicToken({
      scopes: workActivityReadScopeForUser(userId),
      expirationTime: "15m",
    });
    return {
      accessToken,
      baseURL: process.env.TRIGGER_API_URL!.trim().replace(/\/+$/, ""),
      tag,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
  },
});

export const dispatchImageMetadataRefresh: any = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    forcePalette: v.optional(v.boolean()),
    runMetadata: v.optional(v.boolean()),
  },
  returns: v.object({ runId: v.string() }),
  handler: async (ctx, args): Promise<{ runId: string }> => {
    const taskId = "pindeck-image-refresh";
    requireTriggerConfig();
    const idempotencyKey = createImageRefreshIdempotencyKey(args);
    const { dispatchId, existingRunId } = await claimDispatch(
      ctx,
      args.imageId,
      taskId,
      idempotencyKey,
    );
    if (existingRunId) {
      await reconcileReusedRun(
        ctx,
        args.imageId,
        taskId,
        dispatchId,
        existingRunId,
        true,
      );
      return { runId: existingRunId };
    }
    try {
      const handle = await tasks.trigger(
        taskId,
        { ...args, dispatchId },
        {
          idempotencyKey: dispatchId,
          idempotencyKeyTTL: "1h",
          maxAttempts: 2,
          tags: [
            "pindeck",
            "image-refresh",
            "analysis",
            `image:${args.imageId}`,
            `user:${args.userId}`,
          ],
          metadata: {
            stage: "queued",
            stageLabel: "Waiting for analysis capacity",
            progressMode: "indeterminate",
            imageId: args.imageId,
          },
        },
      );
      await recordQueuedRun(ctx, args.imageId, taskId, dispatchId, handle.id);
      await reconcileReusedRun(
        ctx,
        args.imageId,
        taskId,
        dispatchId,
        handle.id,
        true,
      );
      return { runId: handle.id };
    } catch (error) {
      await recordDispatchFailure(
        ctx,
        args.imageId,
        taskId,
        dispatchId,
        error,
        true,
      );
      throw error;
    }
  },
});

export const dispatchFinalizeUpload = ownedImageDispatch(
  "pindeck-finalize-upload",
  ["pindeck", "upload", "media"],
  3,
);

export const dispatchExternalIngest = ownedImageDispatch(
  "pindeck-external-ingest",
  ["pindeck", "ingest", "media"],
  3,
);

export const dispatchMediaRepair = ownedImageDispatch(
  "pindeck-media-repair",
  ["pindeck", "repair", "media"],
  2,
);

export const dispatchVariationGeneration: any = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    variationCount: v.number(),
    modificationMode: v.string(),
    variationDetail: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  returns: v.object({ runId: v.string() }),
  handler: async (ctx, args): Promise<{ runId: string }> => {
    const taskId = "pindeck-generate-variations";
    requireTriggerConfig();
    const idempotencyKey = createVariationGenerationIdempotencyKey(args);
    const { dispatchId, existingRunId } = await claimDispatch(
      ctx,
      args.imageId,
      taskId,
      idempotencyKey,
    );
    if (existingRunId) {
      await reconcileReusedRun(
        ctx,
        args.imageId,
        taskId,
        dispatchId,
        existingRunId,
        true,
      );
      return { runId: existingRunId };
    }
    try {
      const handle = await tasks.trigger(
        taskId,
        { ...args, dispatchId },
        {
          idempotencyKey: dispatchId,
          idempotencyKeyTTL: "1h",
          maxAttempts: 1,
          tags: [
            "pindeck",
            "generation",
            `image:${args.imageId}`,
            `user:${args.userId}`,
          ],
          metadata: {
            stage: "queued",
            stageLabel: "Waiting for generation capacity",
            progressMode: "exact",
            processedItems: 0,
            completedItems: 0,
            failedItems: 0,
            totalItems: args.variationCount,
            imageId: args.imageId,
            variationCount: args.variationCount,
          },
        },
      );
      await recordQueuedRun(ctx, args.imageId, taskId, dispatchId, handle.id);
      await reconcileReusedRun(
        ctx,
        args.imageId,
        taskId,
        dispatchId,
        handle.id,
        true,
      );
      return { runId: handle.id };
    } catch (error) {
      await recordDispatchFailure(
        ctx,
        args.imageId,
        taskId,
        dispatchId,
        error,
        true,
      );
      throw error;
    }
  },
});

function ownedImageDispatch(
  taskId: string,
  tags: string[],
  maxAttempts: number,
) {
  return internalAction({
    args: {
      imageId: v.id("images"),
      userId: v.id("users"),
    },
    returns: v.object({ runId: v.string() }),
    handler: async (ctx, args): Promise<{ runId: string }> => {
      requireTriggerConfig();
      const idempotencyKey = createOwnedImageTaskIdempotencyKey(taskId, args);
      const { dispatchId, existingRunId } = await claimDispatch(
        ctx,
        args.imageId,
        taskId,
        idempotencyKey,
      );
      if (existingRunId) {
        await reconcileReusedRun(
          ctx,
          args.imageId,
          taskId,
          dispatchId,
          existingRunId,
          false,
        );
        return { runId: existingRunId };
      }
      try {
        const handle = await tasks.trigger(
          taskId,
          { ...args, dispatchId },
          {
            idempotencyKey: dispatchId,
            idempotencyKeyTTL: "1h",
            maxAttempts,
            tags: [...tags, `image:${args.imageId}`, `user:${args.userId}`],
            metadata: {
              stage: "queued",
              stageLabel: "Waiting for media capacity",
              progressMode: "indeterminate",
              imageId: args.imageId,
            },
          },
        );
        await recordQueuedRun(ctx, args.imageId, taskId, dispatchId, handle.id);
        await reconcileReusedRun(
          ctx,
          args.imageId,
          taskId,
          dispatchId,
          handle.id,
          false,
        );
        return { runId: handle.id };
      } catch (error) {
        await recordDispatchFailure(
          ctx,
          args.imageId,
          taskId,
          dispatchId,
          error,
          false,
        );
        throw error;
      }
    },
  });
}

async function claimDispatch(
  ctx: any,
  imageId: string,
  task: string,
  idempotencyKey: string,
): Promise<{ dispatchId: string; existingRunId?: string }> {
  const candidateDispatchId = createDispatchId(idempotencyKey, randomUUID());
  const claim = await runDispatchClaim(ctx, {
    imageId,
    task,
    idempotencyKey,
    dispatchId: candidateDispatchId,
  });
  if (claim.leaseExpired && claim.existingRunId && claim.dispatchId) {
    let run;
    try {
      run = await runs.retrieve(claim.existingRunId);
    } catch (error) {
      throw new Error(
        `Unable to verify expired Trigger lease for run ${claim.existingRunId}: ${errorMessage(error)}`,
      );
    }
    const terminalStatus = orchestrationStatusForTerminalTriggerRun(run.status);
    await ctx.runMutation(
      (internal as any).orchestrationState.internalSetOrchestrationState,
      {
        imageId,
        task,
        runId: claim.existingRunId,
        dispatchId: claim.dispatchId,
        status:
          terminalStatus ?? (run.status === "EXECUTING" ? "running" : "queued"),
        requireDispatchIdMatch: true,
        aiStatus:
          terminalStatus && taskUpdatesAiStatus(task)
            ? aiStatusForTerminalTriggerRun(run.status)
            : undefined,
      },
    );
    if (!terminalStatus) {
      return {
        dispatchId: claim.dispatchId,
        existingRunId: claim.existingRunId,
      };
    }
    const reconciledClaim = await runDispatchClaim(ctx, {
      imageId,
      task,
      idempotencyKey,
      dispatchId: candidateDispatchId,
    });
    return acceptedDispatchClaim(reconciledClaim);
  }
  return acceptedDispatchClaim(claim);
}

type DispatchClaim = {
  claimed: boolean;
  dispatchId?: string;
  existingRunId?: string;
  leaseExpired?: boolean;
};

async function runDispatchClaim(
  ctx: any,
  args: {
    imageId: string;
    task: string;
    idempotencyKey: string;
    dispatchId: string;
  },
): Promise<DispatchClaim> {
  return await ctx.runMutation(
    (internal as any).orchestrationState.internalClaimOrchestrationDispatch,
    args,
  );
}

function acceptedDispatchClaim(claim: DispatchClaim): {
  dispatchId: string;
  existingRunId?: string;
} {
  if (!claim.claimed) {
    throw new Error(
      claim.existingRunId
        ? `Image already has active Trigger run ${claim.existingRunId}`
        : "Image is unavailable for Trigger dispatch",
    );
  }
  if (!claim.dispatchId)
    throw new Error("Trigger dispatch claim did not return a correlation ID");
  return { dispatchId: claim.dispatchId, existingRunId: claim.existingRunId };
}

function taskUpdatesAiStatus(task: string) {
  return (
    task === "pindeck-image-refresh" ||
    task === "pindeck-generate-variations" ||
    task === "pindeck-finalize-upload"
  );
}

async function recordQueuedRun(
  ctx: any,
  imageId: string,
  task: string,
  dispatchId: string,
  runId: string,
) {
  const applied = await ctx.runMutation(
    (internal as any).orchestrationState.internalSetOrchestrationState,
    {
      imageId,
      task,
      runId,
      dispatchId,
      status: "queued",
      requireDispatchIdMatch: true,
      preserveAdvancedStatus: true,
    },
  );
  if (!applied)
    throw new Error(
      "Trigger dispatch was superseded before its run ID was recorded",
    );
}

async function recordDispatchFailure(
  ctx: any,
  imageId: string,
  task: string,
  dispatchId: string,
  error: unknown,
  updateAiStatus: boolean,
) {
  await ctx.runMutation(
    (internal as any).orchestrationState.internalSetOrchestrationState,
    {
      imageId,
      task,
      dispatchId,
      status: "failed",
      error: errorMessage(error),
      requireDispatchIdMatch: true,
      aiStatus: updateAiStatus ? "failed" : undefined,
    },
  );
}

async function reconcileReusedRun(
  ctx: any,
  imageId: string,
  task: string,
  dispatchId: string,
  runId: string,
  updateAiStatus: boolean,
) {
  try {
    const run = await runs.retrieve(runId);
    const status = orchestrationStatusForTerminalTriggerRun(run.status);
    if (!status) return;
    await ctx.runMutation(
      (internal as any).orchestrationState.internalSetOrchestrationState,
      {
        imageId,
        task,
        runId,
        dispatchId,
        status,
        requireDispatchIdMatch: true,
        aiStatus: updateAiStatus
          ? aiStatusForTerminalTriggerRun(run.status)
          : undefined,
      },
    );
  } catch (error) {
    // Dispatch succeeded. A transient read-after-write failure must not mark a
    // newly queued run failed; the task callback remains authoritative.
    console.warn("Unable to reconcile Pindeck Trigger run state", {
      runId,
      error,
    });
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function requireTriggerConfig() {
  if (
    !process.env.TRIGGER_API_URL?.trim() ||
    !process.env.TRIGGER_SECRET_KEY?.trim()
  ) {
    throw new Error("Pindeck Trigger.dev dispatch is not configured");
  }
}
