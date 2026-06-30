/** Sidebar + gallery/table shared filter state */

export type LibraryFilters = {
  /** `null` = no filter; `""` = images with empty `group` */
  group: string | null;
  genre: string | null;
  style: string | null;
  originalsOnly: boolean;
  hasSref: boolean;
  colorHex: string | null;
};

export function defaultLibraryFilters(): LibraryFilters {
  return {
    group: null,
    genre: null,
    style: null,
    originalsOnly: false,
    hasSref: false,
    colorHex: null,
  };
}

export function normalizeColorHex(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let s = String(raw).trim();
  if (!s.startsWith("#")) s = `#${s}`;
  let h = s.slice(1).split(/[, \t]/)[0]?.replace(/^#/, "") ?? "";
  if (h.length === 8 || h.length === 4) h = h.slice(0, 6);
  if (/^[0-9a-f]{3}$/i.test(h)) {
    h = [...h].map((ch) => ch + ch).join("");
  }
  if (/^[0-9a-f]{6}$/i.test(h)) return `#${h.toLowerCase()}`;
  return null;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeColorHex(hex);
  if (!normalized) return null;
  const h = normalized.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colorDistance(a: string, b: string): number {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return Number.POSITIVE_INFINITY;
  const [r1, g1, b1] = rgbA;
  const [r2, g2, b2] = rgbB;
  const rMean = (r1 + r2) / 2;
  const r = r1 - r2;
  const g = g1 - g2;
  const blue = b1 - b2;
  return Math.sqrt((2 + rMean / 256) * r * r + 4 * g * g + (2 + (255 - rMean) / 256) * blue * blue);
}

function hasNearbyColor(colors: unknown, targetHex: string): boolean {
  if (!Array.isArray(colors)) return false;
  const target = normalizeColorHex(targetHex);
  if (!target) return false;
  return colors.some((color) => {
    const hex = normalizeColorHex(color);
    return hex ? colorDistance(hex, target) <= 78 : false;
  });
}

export function normalizeLibraryGroup(value?: string): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/[\s_-]+/g, " ");
  if (key === "spec commercial") return "Commercial";
  if (key === "commercial") return "Commercial";
  if (key === "film") return "Film";
  if (key === "video game cinematic") return "Video Game Cinematic";
  if (key === "music video") return "Music Video";
  return raw;
}

export function applyLibraryFilters<T extends {
  group?: string;
  genre?: string;
  style?: string;
  parentImageId?: string;
  sref?: string;
  colors?: string[];
}>(images: T[], f: LibraryFilters): T[] {
  return images.filter((im) => {
    if (f.group !== null) {
      const g = normalizeLibraryGroup(im.group);
      if (f.group === "") {
        if (g) return false;
      } else if (g !== f.group) return false;
    }
    if (f.genre !== null && (im.genre?.trim() ?? "") !== f.genre) return false;
    if (f.style !== null && (im.style?.trim() ?? "") !== f.style) return false;
    if (f.originalsOnly && im.parentImageId) return false;
    if (f.hasSref && !im.sref?.trim()) return false;
    if (f.colorHex && !hasNearbyColor(im.colors, f.colorHex)) return false;
    return true;
  });
}
