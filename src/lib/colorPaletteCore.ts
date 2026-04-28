/**
 * Dominant swatch extraction: frequency-first cluster mass + **centroid RGB** per bucket
 * (eyedropper-like averages, not quantized lattice centers), perceptual separation in Lab,
 * strong suppression of low-mass magenta/purple in warm‑dominant scenes.
 *
 * Used by convex/colorExtraction.ts and src/lib/colorExtraction.ts — keep in sync.
 */

export function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

export function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

function rgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** CIE Lab (D65) for perceptual distance between swatches */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = rgbToLinear(r);
  const G = rgbToLinear(g);
  const B = rgbToLinear(b);
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  const Xn = X / 0.95047;
  const Yn = Y / 1.0;
  const Zn = Z / 1.08883;
  const fx = Xn > 0.008856 ? Math.cbrt(Xn) : 7.787 * Xn + 16 / 116;
  const fy = Yn > 0.008856 ? Math.cbrt(Yn) : 7.787 * Yn + 16 / 116;
  const fz = Zn > 0.008856 ? Math.cbrt(Zn) : 7.787 * Zn + 16 / 116;
  const L = 116 * fy - 16;
  const aa = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return [L, aa, bb];
}

export function labDistanceSq(a: [number, number, number], b: [number, number, number]): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dL * dL + da * da + db * db;
}

/**
 * Exclude near-black JPEG shadow noise (often bogus purple/fringe),
 * grayscale, and blown highlights — keep midtone mass for swatches.
 */
export function isMeaningfulColor(r: number, g: number, b: number): boolean {
  const maxCh = Math.max(r, g, b);
  const brightness = getBrightness(r, g, b);
  const saturation = getSaturation(r, g, b);
  if (maxCh < 52) return false;
  if (brightness < 0.14 && saturation > 0.5 && maxCh < 72) return false;
  if (brightness > 0.96 && saturation < 0.12) return false;
  if (saturation < 0.06) return false;
  return true;
}

export function quantize(
  r: number,
  g: number,
  b: number,
  levels: number
): [number, number, number] {
  const f = 255 / levels;
  return [
    Math.round((r / 255) * levels) * f,
    Math.round((g / 255) * levels) * f,
    Math.round((b / 255) * levels) * f,
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const R = Math.max(0, Math.min(255, Math.round(r)));
  const G = Math.max(0, Math.min(255, Math.round(g)));
  const B = Math.max(0, Math.min(255, Math.round(b)));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/** Hue 0–360; null ~ gray */
export function rgbHueDegrees(r: number, g: number, b: number): number | null {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d < 0.008) return null;
  let h = 0;
  if (max === rn) {
    let x = ((gn - bn) / d) % 6;
    if (x < 0) x += 6;
    h = x * 60;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) * 60;
  } else {
    h = ((rn - gn) / d + 4) * 60;
  }
  if (h < 0) h += 360;
  return h % 360;
}

/** Magenta–purple fringe in an otherwise sunset/warm plate (hue ~210–340°), low pixel share — drop. */
function shouldRejectHueInWarmScene(params: {
  hue: number | null;
  bucketShare: number;
  bucketCount: number;
  warmMass: number;
  coolMass: number;
  maxBucketCount: number;
}): boolean {
  const { hue, bucketShare, bucketCount, warmMass, coolMass, maxBucketCount } = params;
  if (hue === null) return false;
  // Scene clearly warm-heavy
  const sceneWarmDominant =
    warmMass > coolMass * 2.2 && warmMass > coolMass + Math.max(1, (warmMass + coolMass) * 0.15);
  if (!sceneWarmDominant) return false;
  const inBlueMagentaPurple = hue >= 210 && hue <= 340;
  if (!inBlueMagentaPurple) return false;
  const marginal = bucketShare < 0.05 && bucketCount < maxBucketCount * 0.055;
  return marginal;
}

type BucketAcc = {
  sumR: number;
  sumG: number;
  sumB: number;
  count: number;
};

type Scored = {
  rgb: [number, number, number];
  count: number;
  lab: [number, number, number];
  share: number;
  dominanceScore: number;
};

export interface PaletteOptions {
  topN?: number;
  quantizeLevels?: number;
  /** Minimum bucket mass vs all meaningful pixels (default 1%). */
  minShare?: number;
  /** Minimum Lab distance between picked swatches (default ~19). */
  minLabDelta?: number;
}

/**
 * Extract dominant hex colors from packed RGB (3 bytes/pixel) or RGBA (4 bytes, alpha skipped if < 128).
 * Final RGB per cluster = **average** of contributing pixels → matches what you see, not lattice corners.
 */
export function extractDominantHexes(
  bytes: Uint8Array,
  channels: 3 | 4,
  opt: PaletteOptions = {}
): string[] {
  const topN = opt.topN ?? 5;
  const levels = opt.quantizeLevels ?? 36;
  const minShare = opt.minShare ?? 0.01;
  const minLabDelta = opt.minLabDelta ?? 19;
  const minLabSq = minLabDelta * minLabDelta;
  const stride = channels;

  const buckets = new Map<string, BucketAcc>();
  let meaningfulTotal = 0;

  for (let i = 0; i + 2 < bytes.length; i += stride) {
    if (channels === 4 && bytes[i + 3]! < 128) continue;
    const r = bytes[i]!;
    const g = bytes[i + 1]!;
    const b = bytes[i + 2]!;
    if (!isMeaningfulColor(r, g, b)) continue;
    meaningfulTotal++;
    const [qr, qg, qb] = quantize(r, g, b, levels);
    const rr = Math.round(qr);
    const gg = Math.round(qg);
    const bb = Math.round(qb);
    const key = `${rr}|${gg}|${bb}`;
    const ex = buckets.get(key);
    if (ex) {
      ex.sumR += r;
      ex.sumG += g;
      ex.sumB += b;
      ex.count += 1;
    } else {
      buckets.set(key, { sumR: r, sumG: g, sumB: b, count: 1 });
    }
  }

  if (meaningfulTotal === 0 || buckets.size === 0) return [];

  const clusters = Array.from(buckets.entries()).map(([, acc]) => {
    const cr = Math.round(acc.sumR / acc.count);
    const cg = Math.round(acc.sumG / acc.count);
    const cb = Math.round(acc.sumB / acc.count);
    return {
      rgb: [cr, cg, cb] as [number, number, number],
      count: acc.count,
    };
  });

  const minCount = Math.max(6, Math.floor(meaningfulTotal * minShare));
  let list = clusters.filter((b) => b.count >= minCount);
  if (list.length === 0) list = clusters.slice();

  const maxCount = Math.max(...list.map((b) => b.count));

  let warmMass = 0;
  let coolMass = 0;
  for (const b of list) {
    const h = rgbHueDegrees(b.rgb[0], b.rgb[1], b.rgb[2]);
    if (h === null) continue;
    if (h >= 12 && h <= 105) warmMass += b.count;
    if (h >= 195 && h <= 330) coolMass += b.count;
  }

  const scored: Scored[] = list.map((b) => {
    const [r, g, b0] = b.rgb;
    const sat = getSaturation(r, g, b0);
    const share = b.count / meaningfulTotal;
    const dominanceScore = share * (1 + 0.045 * sat);
    return {
      rgb: b.rgb,
      count: b.count,
      lab: rgbToLab(r, g, b0),
      share,
      dominanceScore,
    };
  });

  scored.sort((a, b) => b.dominanceScore - a.dominanceScore);

  const reject = (c: Scored): boolean =>
    shouldRejectHueInWarmScene({
      hue: rgbHueDegrees(c.rgb[0], c.rgb[1], c.rgb[2]),
      bucketShare: c.share,
      bucketCount: c.count,
      warmMass,
      coolMass,
      maxBucketCount: maxCount,
    });

  const picked: Scored[] = [];
  const usedHex = new Set<string>();

  for (const c of scored) {
    if (picked.length >= topN) break;
    const hx = rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]);
    if (usedHex.has(hx)) continue;
    if (picked.some((p) => labDistanceSq(p.lab, c.lab) < minLabSq)) continue;
    if (reject(c)) continue;
    picked.push(c);
    usedHex.add(hx);
  }

  while (picked.length < topN) {
    const next = scored.find((c) => {
      const hx = rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]);
      if (usedHex.has(hx)) return false;
      if (reject(c)) return false;
      return !picked.some((p) => labDistanceSq(p.lab, c.lab) < minLabSq * 0.72);
    });
    if (!next) break;
    picked.push(next);
    usedHex.add(rgbToHex(next.rgb[0], next.rgb[1], next.rgb[2]));
  }

  return picked.slice(0, topN).map((p) => rgbToHex(p.rgb[0], p.rgb[1], p.rgb[2]));
}
