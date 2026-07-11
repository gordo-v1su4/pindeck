import { describe, expect, test } from "bun:test";

import {
  isLikelyDirectImageUrl,
  normalizeImageSourceUrl,
  preferredImageUrlForSampling,
} from "../convex/colorExtractionUrls";

describe("media repair URL selection", () => {
  test("normalizes punctuation accidentally copied into source URLs", () => {
    expect(normalizeImageSourceUrl("https://s.mj.run/baPoKlGYWMo>")).toBe(
      "https://s.mj.run/baPoKlGYWMo",
    );
    expect(isLikelyDirectImageUrl("https://s.mj.run/baPoKlGYWMo>")).toBe(true);
  });

  test("prefers a direct external source when durable RustFS URLs may be stale", () => {
    expect(
      preferredImageUrlForSampling({
        sourceUrl: "https://v3b.fal.media/files/example.png",
        imageUrl: "https://s3.v1su4.dev/pindeck/media-uploads/missing.png",
      }),
    ).toBe("https://v3b.fal.media/files/example.png");
  });

  test("does not treat a source page as a repairable image", () => {
    expect(isLikelyDirectImageUrl("https://fxtwitter.com/sergeantsref/status/123")).toBe(
      false,
    );
  });
});
