import { describe, expect, test } from "bun:test";

import { safeProviderMessage } from "../src/trigger/workMetadata";

describe("Trigger work metadata", () => {
  test("normalizes provider status messages", () => {
    expect(safeProviderMessage(" Rendering\n frame  2 ")).toBe(
      "Rendering frame 2",
    );
  });

  test("redacts provider URLs and credential-shaped fields", () => {
    expect(
      safeProviderMessage(
        "Output https://provider.example/file?signature=secret token=abc123secret456",
      ),
    ).toBe("Output [provider URL] [redacted]");
  });
});
