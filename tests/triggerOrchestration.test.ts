import { describe, expect, test } from "bun:test";

import { createImageRefreshIdempotencyKey } from "../convex/triggerDispatch";

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
});
