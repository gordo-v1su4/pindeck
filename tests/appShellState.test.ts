import { describe, expect, test } from "bun:test";

import {
  sanitizeGalleryDisplayMode,
  sanitizeStoredView,
} from "../src/components/shell/useAppView";
import { parseStoredTableColumnVisibility } from "../src/components/shell/useTableColumnVisibility";
import { defaultTableVisibleColumns } from "../src/components/shell/types";

describe("sanitizeStoredView", () => {
  test("keeps known view ids", () => {
    expect(sanitizeStoredView("table")).toBe("table");
    expect(sanitizeStoredView("deck")).toBe("deck");
    expect(sanitizeStoredView("upload")).toBe("upload");
  });

  test("falls back to gallery for missing or invalid values", () => {
    expect(sanitizeStoredView(null)).toBe("gallery");
    expect(sanitizeStoredView("")).toBe("gallery");
    expect(sanitizeStoredView("not-a-view")).toBe("gallery");
  });
});

describe("sanitizeGalleryDisplayMode", () => {
  test("keeps known display modes", () => {
    expect(sanitizeGalleryDisplayMode("project-rows")).toBe("project-rows");
    expect(sanitizeGalleryDisplayMode("sref-rows")).toBe("sref-rows");
    expect(sanitizeGalleryDisplayMode("random")).toBe("random");
  });

  test("falls back to random", () => {
    expect(sanitizeGalleryDisplayMode(null)).toBe("random");
    expect(sanitizeGalleryDisplayMode("grid")).toBe("random");
  });
});

describe("parseStoredTableColumnVisibility", () => {
  test("returns defaults when storage is empty", () => {
    expect(parseStoredTableColumnVisibility(null)).toEqual(
      defaultTableVisibleColumns,
    );
  });

  test("merges stored flags onto defaults", () => {
    expect(
      parseStoredTableColumnVisibility(
        JSON.stringify({ palette: false, tags: false }),
      ),
    ).toEqual({
      ...defaultTableVisibleColumns,
      palette: false,
      tags: false,
    });
  });

  test("returns defaults when storage is invalid JSON", () => {
    expect(parseStoredTableColumnVisibility("{")).toEqual(
      defaultTableVisibleColumns,
    );
  });
});
