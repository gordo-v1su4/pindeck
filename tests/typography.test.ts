import { describe, expect, test } from "bun:test";
import { PD_FONT_STACKS } from "../src/lib/pdTheme";
import { formatProjectRowLabel } from "../src/lib/projectRowLabels";

describe("Pindeck typography", () => {
  test("keeps a bundled sans-serif fallback for every typography choice", () => {
    for (const stack of PD_FONT_STACKS) {
      expect(stack.css).toContain("Inter Variable");
      expect(stack.css).toContain("system-ui");
    }
  });

  test("removes Discord markdown and source URLs from project row labels", () => {
    expect(
      formatProjectRowLabel(
        "**<https://s.mj.run/example> 24 year old arab gang cholo",
      ),
    ).toBe("24 year old arab gang cholo");
    expect(formatProjectRowLabel("**urban saint, neon color")).toBe(
      "urban saint, neon color",
    );
  });
});
