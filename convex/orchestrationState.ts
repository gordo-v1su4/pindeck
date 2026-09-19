import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  ORCHESTRATION_DEDUPE_MS,
  ORCHESTRATION_LEASE_MS,
} from "./orchestrationSeam";

/**
 * Lease + status writes for Trigger orchestration.
 * Image documents only store the orchestration* fields; callers go through here.
 */

export const internalClaimOrchestrationDispatch = internalMutation({
  args: {
    imageId: v.id("images"),
    task: v.string(),
    idempotencyKey: v.string(),
    dispatchId: v.string(),
  },
  returns: v.object({
    claimed: v.boolean(),
    dispatchId: v.optional(v.string()),
    existingRunId: v.optional(v.string()),
    leaseExpired: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return { claimed: false };
    const now = Date.now();
    const active =
      image.orchestrationStatus === "queued" ||
      image.orchestrationStatus === "running";
    const liveLease = active && (image.orchestrationLeaseExpiresAt ?? 0) > now;
    const liveDeduplicationWindow =
      image.orchestrationIdempotencyKey === args.idempotencyKey &&
      (image.orchestrationClaimedAt ?? 0) + ORCHESTRATION_DEDUPE_MS > now;
    if (
      liveLease &&
      image.orchestrationIdempotencyKey !== args.idempotencyKey
    ) {
      return { claimed: false, existingRunId: image.orchestrationRunId };
    }
    if (active && !liveLease && image.orchestrationRunId) {
      return {
        claimed: false,
        dispatchId: image.orchestrationDispatchId,
        existingRunId: image.orchestrationRunId,
        leaseExpired: true,
      };
    }
    if (liveLease && liveDeduplicationWindow && image.orchestrationDispatchId) {
      return {
        claimed: true,
        dispatchId: image.orchestrationDispatchId,
        existingRunId: image.orchestrationRunId,
      };
    }
    if (!active && liveDeduplicationWindow && image.orchestrationDispatchId) {
      return {
        claimed: true,
        dispatchId: image.orchestrationDispatchId,
        existingRunId: image.orchestrationRunId,
      };
    }
    await ctx.db.patch(args.imageId, {
      orchestrationTask: args.task,
      orchestrationIdempotencyKey: args.idempotencyKey,
      orchestrationDispatchId: args.dispatchId,
      orchestrationClaimedAt: now,
      orchestrationLeaseExpiresAt: now + ORCHESTRATION_LEASE_MS,
      orchestrationRunId: undefined,
      orchestrationStatus: "queued",
      orchestrationError: undefined,
      orchestrationStep: undefined,
      orchestrationResult: undefined,
      orchestrationUpdatedAt: now,
    });
    return {
      claimed: true,
      dispatchId: args.dispatchId,
    };
  },
});

export const internalSetOrchestrationState = internalMutation({
  args: {
    imageId: v.id("images"),
    task: v.string(),
    runId: v.optional(v.string()),
    dispatchId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
    requireRunIdMatch: v.optional(v.boolean()),
    requireDispatchIdMatch: v.optional(v.boolean()),
    step: v.optional(v.string()),
    resultJson: v.optional(v.string()),
    clearProgress: v.optional(v.boolean()),
    clearRunId: v.optional(v.boolean()),
    preserveAdvancedStatus: v.optional(v.boolean()),
    aiStatus: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return false;
    if (
      args.requireRunIdMatch &&
      (!args.runId ||
        image.orchestrationRunId !== args.runId ||
        image.orchestrationTask !== args.task)
    ) {
      return false;
    }
    if (
      args.requireDispatchIdMatch &&
      (!args.dispatchId || image.orchestrationDispatchId !== args.dispatchId)
    ) {
      return false;
    }
    const preserveStatus =
      args.preserveAdvancedStatus &&
      args.status === "queued" &&
      (image.orchestrationStatus === "running" ||
        image.orchestrationStatus === "completed");
    const patch: Record<string, unknown> = {
      orchestrationTask: args.task,
      orchestrationRunId: args.runId ?? image.orchestrationRunId,
      orchestrationDispatchId: args.dispatchId ?? image.orchestrationDispatchId,
      orchestrationStatus: preserveStatus
        ? image.orchestrationStatus
        : args.status,
      orchestrationError: args.error,
      orchestrationUpdatedAt: Date.now(),
      orchestrationLeaseExpiresAt:
        args.status === "queued" || args.status === "running"
          ? Date.now() + ORCHESTRATION_LEASE_MS
          : undefined,
    };
    if (args.aiStatus !== undefined) patch.aiStatus = args.aiStatus;
    if (args.clearProgress) {
      patch.orchestrationStep = undefined;
      patch.orchestrationResult = undefined;
    }
    if (args.clearRunId) patch.orchestrationRunId = undefined;
    if (args.step !== undefined) patch.orchestrationStep = args.step;
    if (args.resultJson !== undefined)
      patch.orchestrationResult = args.resultJson;
    await ctx.db.patch(args.imageId, patch);
    return true;
  },
});
