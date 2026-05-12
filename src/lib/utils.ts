import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TAG_COLORS = [
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
] as const;

export function getTagColor(tag: string) {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = tag.charCodeAt(index) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[colorIndex];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

function getBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [red, green, blue] = rgb;
  return (red * 299 + green * 587 + blue * 114) / 1000 / 255;
}

export function sortColorsDarkToLight(colors: string[]): string[] {
  return colors
    .filter((color) => /^#?[0-9A-Fa-f]{6}$/.test(color))
    .map((color) => (color.startsWith("#") ? color : `#${color}`))
    .sort((colorA, colorB) => getBrightness(colorA) - getBrightness(colorB));
}

export const compactImageTagClass =
  "pd-image-tag-chip tracking-normal";

function withAlpha(hex: string, alpha: number): string {
  const boundedAlpha = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(boundedAlpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alphaHex}`;
}

function mixHex(hex: string, targetHex: string, amount: number): string {
  const sourceRgb = hexToRgb(hex);
  const targetRgb = hexToRgb(targetHex);
  if (!sourceRgb || !targetRgb) return hex;

  const clampedAmount = Math.max(0, Math.min(1, amount));
  const mixed = sourceRgb.map((channel, index) =>
    Math.round(channel + (targetRgb[index] - channel) * clampedAmount)
  ) as [number, number, number];

  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function getPaletteTagColor(
  colors: string[] | undefined,
  index: number,
  totalCount = 1
): string {
  const palette = sortColorsDarkToLight(colors ?? []);
  if (palette.length === 0) return "#6b7280";
  return palette[index % palette.length];
}

export function getPaletteTagStyle(
  colors: string[] | undefined,
  index: number,
  totalCount = 1
): CSSProperties {
  const accent = getPaletteTagColor(colors, index, totalCount);
  const brightness = getBrightness(accent);
  const isLightAccent = brightness > 0.66;
  const textColor = isLightAccent
    ? mixHex(accent, "#111111", 0.5)
    : mixHex(accent, "#ffffff", 0.22);

  return {
    backgroundColor: withAlpha(accent, isLightAccent ? 0.14 : 0.18),
    color: textColor,
  };
}

export function getPaletteSwatchStyle(color: string): CSSProperties {
  const normalized = color.startsWith("#") ? color : `#${color}`;
  const brightness = getBrightness(normalized);
  const borderColor =
    brightness > 0.66
      ? mixHex(normalized, "#111111", 0.28)
      : mixHex(normalized, "#ffffff", 0.18);

  return {
    backgroundColor: normalized,
    borderColor,
  };
}
