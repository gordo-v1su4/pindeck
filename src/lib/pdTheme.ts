/**
 * Pindeck design tokens driven by Tweaks (accent + typography).
 * Computed inks stay readable when swapping palette swatches.
 */

export const PD_FONT_STACKS = [
  { id: "geist", css: "'Geist', sans-serif", mono: "'Geist Mono', monospace" },
  { id: "inter", css: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  { id: "archivo", css: "'Archivo', sans-serif", mono: "'DM Mono', monospace" },
  { id: "space", css: "'Space Grotesk', sans-serif", mono: "'JetBrains Mono', monospace" },
] as const;

export type PindeckTypographyId = (typeof PD_FONT_STACKS)[number]["id"];

/** Parse #RGB or #RRGGBB to 0–255 tuples */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    return [58, 123, 255];
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const f = (n: number) => n.toString(16).padStart(2, "0");
  return `#${f(Math.round(clamp255(r)))}${f(Math.round(clamp255(g)))}${f(Math.round(clamp255(b)))}`;
}

function clamp255(n: number) {
  return Math.min(255, Math.max(0, n));
}

/** Light “on-accent” label text: blend accent toward pale cool-neutral with accent tint retained */
export function accentInkFromAccentHex(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const t = 0.58;
  const wr = 248;
  const wg = 250;
  const wb = 252;
  return rgbToHex(r * (1 - t) + wr * t, g * (1 - t) + wg * t, b * (1 - t) + wb * t);
}

/** Hover / pressed states for solid accent buttons */
export function accentMutedFromAccentHex(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const k = 0.78;
  return rgbToHex(r * k, g * k, b * k);
}

/** Readable text directly on saturated accent fills (sign-in CTAs etc.) */
export function accentContrastText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return y > 0.62 ? "#0c0c0f" : "#ffffff";
}

/** 8-digit hex overlay on dark UI (#RRGGBBAA); ~14% opacity for soft washes */
export function accentSoftHexFromAccent(hex: string): string {
  const normalized = /^#?[0-9a-fA-F]{6}$/.test(hex.replace("#", ""))
    ? (hex.startsWith("#") ? hex : `#${hex}`)
    : "#3a7bff";
  return `${normalized.startsWith("#") ? normalized : `#${normalized}`}24`;
}

function normalizeAccentHex(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#3a7bff";
  return `#${h.toLowerCase()}`;
}

export function applyPindeckTweaksToDocument(opts: {
  accent: string;
  typography: string;
}) {
  const accent = normalizeAccentHex(opts.accent);

  const ink = accentInkFromAccentHex(accent);
  const hoverDark = accentMutedFromAccentHex(accent);
  const soft = accentSoftHexFromAccent(accent);
  const contrast = accentContrastText(accent);

  const root = document.documentElement;
  root.style.setProperty("--pd-accent", accent);
  root.style.setProperty("--pd-accent-soft", soft);
  root.style.setProperty("--pd-accent-ink", ink);
  root.style.setProperty("--pd-accent-hover", hoverDark);
  root.style.setProperty("--pd-accent-contrast-text", contrast);

  // TMP-compatible aliases (covers future shared primitives / focus)
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-soft", soft);
  root.style.setProperty("--accent-ink", ink);

  const typo = PD_FONT_STACKS.find((x) => x.id === opts.typography) ?? PD_FONT_STACKS.find((x) => x.id === "geist");
  if (typo) {
    root.style.setProperty("--pd-font-sans", typo.css);
    root.style.setProperty("--pd-font-mono", typo.mono);
  }
}
