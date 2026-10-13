import { describe, expect, test } from "bun:test";
import { buildVariationPromptPlan, composeVariationDetail, parseVariationDetail } from "../convex/lib/variationPrompts";

describe("variationDetail format", () => {
  test("Auto + text that starts with a shot phrase stays Auto", () => {
    const stored = composeVariationDetail("", "close-up; rain starts falling");
    expect(parseVariationDetail(stored)).toEqual({ shot: undefined, text: "close-up; rain starts falling" });
    const prompts = buildVariationPromptPlan({ modificationMode: "shot-variation", variationCount: 2, variationDetail: stored });
    expect(prompts[0]).toContain("Framing: close-up.");
    expect(prompts[1]).toContain("Framing: wide shot.");
  });
  test("chip + text round-trips", () => {
    expect(parseVariationDetail(composeVariationDetail("low angle shot", "he runs"))).toEqual({ shot: "low angle shot", text: "he runs" });
  });
  test("legacy values still parse", () => {
    expect(parseVariationDetail("close-up")).toEqual({ shot: "close-up" });
    expect(parseVariationDetail("wide shot; dusk")).toEqual({ shot: "wide shot", text: "dusk" });
    expect(parseVariationDetail("moody rain")).toEqual({ text: "moody rain" });
  });
  test("auto never picks high angle", () => {
    const p = buildVariationPromptPlan({ modificationMode: "shot-variation", variationCount: 12 });
    expect(p.some((x) => x.includes("high angle"))).toBe(false);
  });
});
