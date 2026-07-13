import { describe, expect, test } from "bun:test";

import { parseClientVisionMetadata } from "../src/lib/clientVision/metadata-format";

describe("client-side LFM metadata", () => {
  test("parses Pindeck metadata from model JSON", () => {
    expect(parseClientVisionMetadata(`noise {"title":"Night Drive","description":"A car crosses a neon city street.","tags":["car","neon"],"shot":"Wide Shot","visual_style":"35mm Film"}`)).toEqual({
      title: "Night Drive",
      description: "A car crosses a neon city street.",
      tags: ["car", "neon"],
      category: undefined,
      group: undefined,
      genre: undefined,
      shot: "Wide Shot",
      style: "35mm Film",
      projectName: undefined,
      moodboardName: undefined,
    });
  });

  test("keeps a usable description when JSON is malformed", () => {
    expect(parseClientVisionMetadata("A silhouetted figure stands in fog.")).toEqual({
      description: "A silhouetted figure stands in fog.",
    });
  });
});
