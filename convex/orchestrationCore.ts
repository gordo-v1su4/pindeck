"use node";

import { createHash } from "node:crypto";

/**
 * Idempotency keys, dispatch IDs, and terminal status mapping.
 * Node-only — import from Trigger dispatch (`"use node"`) or bun tests,
 * not from Convex HTTP actions or mutations.
 */

const terminalFailureStatuses = [
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "INTERRUPTED",
  "TIMED_OUT",
];

export function workActivityTagForUser(userId: string) {
  if (!userId.trim())
    throw new Error("A user ID is required for work activity");
  return `user:${userId}`;
}

export function workActivityReadScopeForUser(userId: string) {
  return { read: { tags: [workActivityTagForUser(userId)] } };
}

export function aiStatusForTerminalTriggerRun(status: string) {
  if (status === "COMPLETED") return "completed";
  if (terminalFailureStatuses.includes(status)) return "failed";
  return undefined;
}

export function orchestrationStatusForTerminalTriggerRun(status: string) {
  if (status === "COMPLETED") return "completed" as const;
  if (terminalFailureStatuses.includes(status)) return "failed" as const;
  return undefined;
}

export function createDispatchId(idempotencyKey: string, nonce: string) {
  const digest = createHash("sha256")
    .update(`${idempotencyKey}:${nonce}`)
    .digest("hex");
  return `pindeck-dispatch:${digest}`;
}

export function createImageRefreshIdempotencyKey(args: {
  imageId: string;
  userId: string;
  forcePalette?: boolean;
  runMetadata?: boolean;
}) {
  const digest = createHash("sha256")
    .update(
      `${args.userId}:${args.imageId}:${args.forcePalette === true}:${args.runMetadata !== false}`,
    )
    .digest("hex");
  return `pindeck-image-refresh:${digest}`;
}

export function createOwnedImageTaskIdempotencyKey(
  task: string,
  args: { imageId: string; userId: string },
) {
  const digest = createHash("sha256")
    .update(`${task}:${args.userId}:${args.imageId}`)
    .digest("hex");
  return `${task}:${digest}`;
}

export function createVariationGenerationIdempotencyKey(args: {
  imageId: string;
  userId: string;
  variationCount: number;
  modificationMode: string;
  variationDetail?: string;
  aspectRatio?: string;
}) {
  const digest = createHash("sha256")
    .update(
      [
        args.userId,
        args.imageId,
        args.variationCount,
        args.modificationMode,
        args.variationDetail ?? "",
        args.aspectRatio ?? "",
      ].join(":"),
    )
    .digest("hex");
  return `pindeck-generate-variations:${digest}`;
}
