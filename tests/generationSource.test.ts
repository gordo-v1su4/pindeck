import { describe, expect, test } from "bun:test";

import { generationSourceCandidates } from "../convex/lib/generationSource";

describe("variation generation source selection", () => {
  test("tries durable display variants before the original URL", () => {
    expect(
      generationSourceCandidates({
        imageUrl: "https://media.example/original.png",
        previewUrl: "https://media.example/preview.webp",
        derivativeUrls: {
          small: "https://media.example/small.webp",
          medium: "https://media.example/medium.webp",
          large: "https://media.example/large.webp",
        },
      }),
    ).toEqual([
      "https://media.example/large.webp",
      "https://media.example/original.png",
      "https://media.example/preview.webp",
      "https://media.example/medium.webp",
      "https://media.example/small.webp",
    ]);
  });

  test("does not send an HTML source page to the image provider", () => {
    expect(
      generationSourceCandidates({ sourceUrl: "https://www.pinterest.com/pin/123" }),
    ).toEqual([]);
  });
});
