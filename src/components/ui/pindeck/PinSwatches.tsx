import React from "react";

interface PinSwatchesProps {
  colors?: string[];
  size?: number;
  gap?: number;
  /**
   * If set (e.g. 5): always render this many slots; extras are dashed placeholders.
   * Omit: only actual swatches (no placeholders) — nicer on gallery cards.
   */
  pad?: number;
  className?: string;
}

/** Normalize to `#RRGGBB`; supports 3‑digit shorthand and ignores alpha suffix. */
function normalizeRgbHex(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let s = String(raw).trim();
  if (!s.startsWith("#")) s = `#${s}`;
  let h = s.slice(1).split(/[, \t]/)[0]?.replace(/^#/, "") ?? "";
  if (h.length === 8 || h.length === 4) {
    h = h.slice(0, 6);
  }
  if (/^[0-9a-f]{3}$/i.test(h)) {
    h = [...h].map((ch) => ch + ch).join("");
  }
  if (/^[0-9a-f]{6}$/i.test(h)) return `#${h.toLowerCase()}`;
  return null;
}

function parseRgbFromNorm(norm: string): [number, number, number] {
  let h = norm.replace(/^#/, "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Visible edge for very dark swatches in dense table strips. */
function swatchRingStyle(rgb: string, size: number): React.CSSProperties {
  const normalized = normalizeRgbHex(rgb) ?? rgb;
  try {
    const [r0, g0, b0] = parseRgbFromNorm(normalized);
    const lum = (r0 * 299 + g0 * 587 + b0 * 114) / 255000;
    const dark = lum < 0.28;
    return {
      width: size,
      height: size,
      background: normalized,
      display: "inline-block",
      borderRadius: 2,
      boxSizing: "border-box" as const,
      boxShadow: dark
        ? `inset 0 0 0 1px rgba(255,255,255,0.26), inset 0 0 0 2px rgba(0,0,0,0.4)`
        : `inset 0 0 0 1px rgba(0,0,0,0.35)`,
    };
  } catch {
    return {
      width: size,
      height: size,
      background: normalized,
      display: "inline-block",
      borderRadius: 2,
      boxSizing: "border-box" as const,
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
    };
  }
}

export function PinSwatches({ colors = [], size = 10, gap = 0, pad: padProp, className = "" }: PinSwatchesProps) {
  const maxSwatches = padProp === undefined ? 32 : padProp;
  const cleaned: string[] = [];
  for (const c of colors || []) {
    const n = normalizeRgbHex(c);
    if (n) cleaned.push(n);
    if (cleaned.length >= maxSwatches) break;
  }

  const items: ({ kind: "swatch"; c: string } | { kind: "empty" })[] = [];
  const slotCount = padProp === undefined ? cleaned.length : padProp;
  for (let i = 0; i < slotCount; i++) {
    if (i < cleaned.length) items.push({ kind: "swatch", c: cleaned[i] });
    else if (padProp !== undefined) items.push({ kind: "empty" });
  }

  return (
    <span style={{ display: "inline-flex", gap }} className={className}>
      {items.map((it, i) =>
        it.kind === "swatch" ? (
          <span key={`s-${it.c}-${i}`} title={it.c} style={swatchRingStyle(it.c, size)} />
        ) : (
          <span
            key={`empty-${i}`}
            aria-hidden
            style={{
              width: size,
              height: size,
              display: "inline-block",
              borderRadius: 2,
              boxSizing: "border-box",
              border: "1px dashed rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.12)",
              verticalAlign: "middle",
            }}
          />
        )
      )}
    </span>
  );
}
