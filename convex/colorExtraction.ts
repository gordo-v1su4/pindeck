"use node";

// Server-side: sharp → RGB buffer → shared dominance-first palette (see src/lib/colorPaletteCore.ts).

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { extractDominantHexes } from "../src/lib/colorPaletteCore";

const MAX_RESAMPLE = 160; // Slightly finer than 128 for stable warm clusters

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function extractColorsFromBuffer(buffer: Buffer): Promise<string[]> {
  let sharp: any;
  try {
    const mod: any = await import("sharp");
    sharp = mod?.default || mod;
  } catch (e) {
    console.warn("[colorExtraction] sharp unavailable", e);
    return [];
  }

  let raw: { data: Buffer; info: { width: number; height: number; channels: number } };
  try {
    raw = await sharp(buffer)
      .rotate()
      .resize(MAX_RESAMPLE, MAX_RESAMPLE, { fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch (e) {
    console.warn("[colorExtraction] sharp resample failed", e);
    return [];
  }

  const u8 = new Uint8Array(raw.data);
  return extractDominantHexes(u8, 3, {
    topN: 5,
    quantizeLevels: 36,
    minShare: 0.01,
    minLabDelta: 19,
  });
}

/**
 * Extract colors for a single image and patch the row.
 * Safe to call any number of times — always overwrites with latest sample.
 */
export const internalExtractAndStoreColors = internalAction({
  args: {
    imageId: v.id("images"),
    imageUrl: v.string(),
  },
  returns: v.object({ ok: v.boolean(), colors: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const url = args.imageUrl;
    if (!url) return { ok: false, colors: [] };

    let buffer: Buffer;
    try {
      buffer = await fetchBuffer(url);
    } catch (e) {
      console.warn("[colorExtraction] fetch failed", e);
      return { ok: false, colors: [] };
    }

    const colors = await extractColorsFromBuffer(buffer);
    if (colors.length === 0) return { ok: false, colors: [] };

    await ctx.runMutation(
      (internal as any).colorExtractionWrite.internalSetColors,
      { imageId: args.imageId, colors }
    );
    return { ok: true, colors };
  },
});
