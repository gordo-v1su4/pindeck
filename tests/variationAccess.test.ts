import { describe, expect, test } from "bun:test";

import { canGenerateVariationFromImage } from "../convex/lib/variationAccess";

describe("variation generation access", () => {
  test("allows an owner to generate from any of their images", () => {
    expect(
      canGenerateVariationFromImage({ uploadedBy: "owner", status: "draft" }, "owner"),
    ).toBe(true);
  });

  test("allows a signed-in user to generate from an active shared image", () => {
    expect(
      canGenerateVariationFromImage({ uploadedBy: "owner", status: "active" }, "viewer"),
    ).toBe(true);
  });

  test("rejects another user's non-active image", () => {
    expect(
      canGenerateVariationFromImage({ uploadedBy: "owner", status: "pending" }, "viewer"),
    ).toBe(false);
  });
});
