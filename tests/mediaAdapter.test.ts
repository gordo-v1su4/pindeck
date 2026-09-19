import { describe, expect, test } from "bun:test";

import {
  adapterForProvider,
  encodeStoragePath,
  nextcloudPublicDavUrl,
  normalizeStoragePath,
  rustfsPublicUrl,
  toKebabCase,
} from "../convex/mediaAdapter";

describe("media path adapter", () => {
  test("normalizes and encodes object paths", () => {
    expect(normalizeStoragePath("/pindeck/ media-uploads //a.png/")).toBe(
      "pindeck/media-uploads/a.png",
    );
    expect(encodeStoragePath("pindeck/media uploads/a.png")).toBe(
      "pindeck/media%20uploads/a.png",
    );
  });

  test("builds RustFS and Nextcloud public URLs from the same path helpers", () => {
    expect(
      rustfsPublicUrl({
        bucket: "pindeck",
        storagePath: "media-uploads/missing.png",
      }),
    ).toBe("https://s3.v1su4.dev/pindeck/media-uploads/missing.png");
    expect(
      nextcloudPublicDavUrl({
        publicBaseUrl: "https://cloud.v1su4.dev",
        token: "share-token",
        relativePath: "media-uploads/a.png",
      }),
    ).toBe(
      "https://cloud.v1su4.dev/public.php/dav/files/share-token/media-uploads/a.png",
    );
    expect(toKebabCase("Hero Still #1")).toBe("hero-still-1");
  });

  test("selects adapters by storage provider", () => {
    expect(adapterForProvider("rustfs").provider).toBe("rustfs");
    expect(adapterForProvider("nextcloud").provider).toBe("nextcloud");
    expect(() =>
      adapterForProvider("convex").publicUrl({ storagePath: "x" }),
    ).toThrow(/storage\.getUrl/);
  });
});
