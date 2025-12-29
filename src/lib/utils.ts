import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TAG_COLORS = [
  "gray", "gold", "bronze", "brown", "yellow", "amber", "orange", "tomato", "red", "ruby", "crimson", "pink", "plum", "purple", "violet", "iris", "indigo", "blue", "cyan", "teal", "jade", "green", "grass", "lime", "mint", "sky"
] as const;

export function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

/**
 * Calculate brightness of a color (0-1 scale)
 * Uses relative luminance formula: (r * 299 + g * 587 + b * 114) / 1000 / 255
 */
function getBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

/**
 * Sort colors from dark to light (ascending brightness)
 * Only uses colors that actually exist (filters out invalid hex codes)
 */
export function sortColorsDarkToLight(colors: string[]): string[] {
  return colors
    .filter(color => {
      // Only keep valid hex colors
      return /^#?[0-9A-Fa-f]{6}$/.test(color);
    })
    .map(color => {
      // Normalize to include # prefix
      return color.startsWith('#') ? color : `#${color}`;
    })
    .sort((a, b) => {
      const brightnessA = getBrightness(a);
      const brightnessB = getBrightness(b);
      return brightnessA - brightnessB; // Dark to light (ascending)
    });
}