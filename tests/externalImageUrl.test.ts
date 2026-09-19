import { describe, expect, test } from "bun:test";

import { normalizeExternalImageUrl } from "../convex/images/shared";

describe("normalizeExternalImageUrl", () => {
  test("strips angle-bracket wrappers used in Discord/markdown pastes", () => {
    expect(
      normalizeExternalImageUrl("<https://cdn.discordapp.com/attachments/1/2.png>"),
    ).toBe("https://cdn.discordapp.com/attachments/1/2.png");
  });

  test("trims trailing punctuation accidentally copied with a URL", () => {
    expect(normalizeExternalImageUrl("https://s.mj.run/baPoKlGYWMo>")).toBe(
      "https://s.mj.run/baPoKlGYWMo",
    );
    expect(normalizeExternalImageUrl("https://example.com/a.png).")).toBe(
      "https://example.com/a.png",
    );
  });

  test("returns empty string for missing values", () => {
    expect(normalizeExternalImageUrl(undefined)).toBe("");
    expect(normalizeExternalImageUrl("   ")).toBe("");
  });
});
