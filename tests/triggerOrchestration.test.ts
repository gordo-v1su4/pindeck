import { describe, expect, test } from "bun:test";

import {
  aiStatusForTerminalTriggerRun,
  createImageRefreshIdempotencyKey,
  createOwnedImageTaskIdempotencyKey,
  createDispatchId,
  createVariationGenerationIdempotencyKey,
  orchestrationStatusForTerminalTriggerRun,
} from "../convex/triggerDispatch";

describe("Pindeck Trigger orchestration", () => {
  test("creates stable scoped idempotency keys without exposing Convex ids", () => {
    const input = {
      imageId: "image-private-id",
      userId: "user-private-id",
      forcePalette: true,
      runMetadata: true,
    };
    const first = createImageRefreshIdempotencyKey(input);
    const second = createImageRefreshIdempotencyKey(input);

    expect(first).toBe(second);
    expect(first).toMatch(/^pindeck-image-refresh:[a-f0-9]{64}$/);
    expect(first).not.toContain(input.imageId);
    expect(first).not.toContain(input.userId);
  });

  test("changes when the requested work changes", () => {
    const base = { imageId: "image-1", userId: "user-1" };
    expect(createImageRefreshIdempotencyKey(base)).not.toBe(
      createImageRefreshIdempotencyKey({ ...base, forcePalette: true }),
    );
  });

  test("reconciles idempotently reused terminal runs", () => {
    expect(aiStatusForTerminalTriggerRun("COMPLETED")).toBe("completed");
    expect(aiStatusForTerminalTriggerRun("FAILED")).toBe("failed");
    expect(aiStatusForTerminalTriggerRun("INTERRUPTED")).toBe("failed");
    expect(aiStatusForTerminalTriggerRun("TIMED_OUT")).toBe("failed");
    expect(aiStatusForTerminalTriggerRun("EXECUTING")).toBeUndefined();
    expect(orchestrationStatusForTerminalTriggerRun("COMPLETED")).toBe("completed");
    expect(orchestrationStatusForTerminalTriggerRun("CRASHED")).toBe("failed");
  });

  test("scopes media task keys by operation without exposing ids", () => {
    const input = { imageId: "private-image", userId: "private-user" };
    const finalize = createOwnedImageTaskIdempotencyKey("pindeck-finalize-upload", input);
    const repair = createOwnedImageTaskIdempotencyKey("pindeck-media-repair", input);
    expect(finalize).toMatch(/^pindeck-finalize-upload:[a-f0-9]{64}$/);
    expect(finalize).not.toContain(input.imageId);
    expect(finalize).not.toBe(repair);
  });

  test("scopes variation generation by requested work", () => {
    const input = {
      imageId: "private-image",
      userId: "private-user",
      variationCount: 2,
      modificationMode: "shot-variation",
      aspectRatio: "16:9",
    };
    const key = createVariationGenerationIdempotencyKey(input);
    expect(key).toMatch(/^pindeck-generate-variations:[a-f0-9]{64}$/);
    expect(key).not.toContain(input.imageId);
    expect(key).not.toBe(createVariationGenerationIdempotencyKey({ ...input, variationCount: 3 }));
  });

  test("creates a stable dispatch correlation from the idempotency key", () => {
    const key = createOwnedImageTaskIdempotencyKey("pindeck-media-repair", {
      imageId: "image-123",
      userId: "user-456",
    });
    const dispatchId = createDispatchId(key, "fixed-nonce");
    expect(dispatchId).toBe(createDispatchId(key, "fixed-nonce"));
    expect(dispatchId).not.toBe(createDispatchId(key, "new-attempt"));
    expect(dispatchId).toMatch(/^pindeck-dispatch:[a-f0-9]{64}$/);
    expect(dispatchId).not.toContain("image-123");
    expect(dispatchId).not.toContain("user-456");
  });
});
