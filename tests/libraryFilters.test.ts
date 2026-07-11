import { describe, expect, test } from "bun:test";

import {
  applyLibraryFilters,
  defaultLibraryFilters,
} from "../src/lib/libraryFilters";

const images = [
  { id: "original" },
  { id: "variation", parentImageId: "original" },
];

describe("library lineage filters", () => {
  test("defaults to showing originals and variations", () => {
    expect(applyLibraryFilters(images, defaultLibraryFilters()).map((image) => image.id)).toEqual([
      "original",
      "variation",
    ]);
  });

  test("shows only originals", () => {
    expect(
      applyLibraryFilters(images, {
        ...defaultLibraryFilters(),
        originalsOnly: true,
      }).map((image) => image.id),
    ).toEqual(["original"]);
  });

  test("shows only variations", () => {
    expect(
      applyLibraryFilters(images, {
        ...defaultLibraryFilters(),
        noOriginals: true,
      }).map((image) => image.id),
    ).toEqual(["variation"]);
  });
});
