"use node";

// Server-side, pixel-accurate color extraction.
//
// We download the image, resample it with sharp to a small RGB raw buffer,
// then run the same quantize/score/perceptual-dedup logic as the client-side
// extractor at src/lib/colorExtraction.ts so results are identical.
//
// This pipeline REPLACES the VLM "colors" field — the VLM was imagining
// plausible-looking hexes, which is why swatches never matched the photo.

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const MAX_RESAMPLE = 128; // 128px longest edge is plenty for dominant-color stats
const TOP_N = 5;
const MIN_PERCEPTUAL_DIST_SQ = 38 * 38;

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

function isMeaningfulColor(r: number, g: number, b: number): boolean {
  const brightness = getBrightness(r, g, b);
  const saturation = getSaturation(r, g, b);
  if (brightness < 0.06) return false;
  if (brightness > 0.94 && saturation < 0.15) return false;
  return true;
}

function quantize(r: number, g: number, b: number, levels = 24): [number, number, number] {
  return [
    Math.round((r / 255) * levels) * (255 / levels),
    Math.round((g / 255) * levels) * (255 / levels),
    Math.round((b / 255) * levels) * (255 / levels),
  ];
}

function colorDistanceSq(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  // Human-perception-weighted squared distance.
  return 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
}

/**
 * Extract the top-N dominant, perceptually-distinct colors from a raw image buffer.
 * Runs sharp resample → raw RGB → quantize → score → perceptual dedup.
 */
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

  const data = raw.data;
  const buckets = new Map<
    string,
    { rgb: [number, number, number]; count: number; saturation: number }
  >();

  // RGB, 3 bytes per pixel. Sample every pixel since the buffer is tiny.
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isMeaningfulColor(r, g, b)) continue;

    const [qr, qg, qb] = quantize(r, g, b, 24);
    const hex = rgbToHex(Math.round(qr), Math.round(qg), Math.round(qb));
    const existing = buckets.get(hex);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(hex, {
        rgb: [Math.round(qr), Math.round(qg), Math.round(qb)],
        count: 1,
        saturation: getSaturation(qr, qg, qb),
      });
    }
  }

  const sorted = Array.from(buckets.values())
    .map((c) => ({ ...c, score: c.count * (0.55 + c.saturation * 0.45) }))
    .sort((a, b) => b.score - a.score);

  const picked: typeof sorted = [];
  for (const c of sorted) {
    if (picked.length >= TOP_N) break;
    const tooClose = picked.some((p) => colorDistanceSq(p.rgb, c.rgb) < MIN_PERCEPTUAL_DIST_SQ);
    if (!tooClose) picked.push(c);
  }

  return picked.map((c) => rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]));
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
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

