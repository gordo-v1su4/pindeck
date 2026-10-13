import { describe, expect, test } from "bun:test";
import { formatSref } from "../src/lib/sref";

describe("complete SREF combinations", () => {
  test("keeps single references separate from combinations", () => {
    expect(formatSref("969705403")).toBe("--sref 969705403");
    expect(formatSref("969705403 2813629345")).toBe("--sref 969705403 2813629345");
    expect(formatSref("--sref 12 34 56 78")).toBe("--sref 12 34 56 78");
  });
  test("normalizes whitespace without commas or changing order", () => {
    expect(formatSref(" 34  \t12 ")).toBe("--sref 34 12");
    expect(formatSref(undefined)).toBe("");
    expect(formatSref(" ")).toBe("");
  });
});
