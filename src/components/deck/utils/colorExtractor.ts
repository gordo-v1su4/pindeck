import { extractColorsFromImage } from '../../../lib/colorExtraction';
import type { ColorPalette } from '../types';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return rgbToHex(R, G, B);
}

function getLuminance(hex: string): number {
  const rgb = parseInt(hex.replace('#', ''), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function mix(hexA: string, hexB: string, amount = 0.5): string {
  const a = parseInt(hexA.replace('#', ''), 16);
  const b = parseInt(hexB.replace('#', ''), 16);
  const channels = [16, 8, 0].map((shift) => {
    const start = (a >> shift) & 0xff;
    const end = (b >> shift) & 0xff;
    return clampChannel(Math.round(start + (end - start) * amount));
  });
  return rgbToHex(channels[0], channels[1], channels[2]);
}

function normalizeHex(hex: string): string {
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4 && /^#[0-9a-f]{3}$/i.test(h)) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  return /^#[0-9a-f]{6}$/i.test(h) ? h : "#888888";
}

function toPalette(partial: Omit<ColorPalette, "dark" | "light">): ColorPalette {
  return {
    ...partial,
    dark: partial.background,
    light: partial.text,
  };
}

/** Map dominance-ordered dominant hex swatches → full deck palette (5 UI swatches aligned with image mass). */
export function paletteFromDominantHexes(raw: string[]): ColorPalette {
  const hexColors = raw.map(normalizeHex).filter((h) => /^#[0-9a-f]{6}$/i.test(h));
  if (hexColors.length < 3) {
    throw new Error("paletteFromDominantHexes needs at least 3 colors");
  }

  const sortedByLuminance = [...hexColors].sort(
    (a, b) => getLuminance(a) - getLuminance(b),
  );

  /** Pad to five dominants — same order Pindeck stores on `images.colors`. */
  const slots = hexColors.slice(0, 5);
  while (slots.length < 5) {
    slots.push(slots[slots.length - 1]);
  }

  const [primary, secondary, accent, tertiary, surfaceSlot] = slots;

  const background = adjustBrightness(sortedByLuminance[0], -30);
  const surface = surfaceSlot;

  const text = adjustBrightness(
    sortedByLuminance[sortedByLuminance.length - 1],
    14,
  );
  const muted = mix(text, accent, 0.32);
  const border = mix(secondary, text, 0.38);

  return toPalette({
    primary,
    secondary,
    accent,
    tertiary,
    background,
    surface,
    text,
    muted,
    border,
  });
}

export async function extractColors(imageUrl: string): Promise<ColorPalette> {
  const hexColors = await extractColorsFromImage(imageUrl);
  if (!hexColors || hexColors.length < 3) {
    throw new Error("Could not extract enough colors");
  }
  return paletteFromDominantHexes(hexColors);
}

export const defaultColors: ColorPalette = {
  primary: '#d2dc64',
  secondary: '#283228',
  accent: '#fff996',
  tertiary: '#b4be78',
  background: '#0a0a0b',
  surface: '#121214',
  text: '#f0f5dc',
  muted: '#cad2aa',
  border: '#6a7438',
  dark: '#0a0a0b',
  light: '#f0f5dc',
};
