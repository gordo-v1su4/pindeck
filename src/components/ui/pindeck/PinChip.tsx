import React from "react";

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

function getBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
}

function mixHex(hex: string, target: string, amount: number): string {
  const s = hexToRgb(hex);
  const t = hexToRgb(target);
  if (!s || !t) return hex;
  const m = Math.max(0, Math.min(1, amount));
  const mixed = s.map((c, i) => Math.round(c + (t[i] - c) * m));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function paletteTagStyle(color: string): React.CSSProperties {
  const normalized = color.startsWith("#") ? color : `#${color}`;
  const brightness = getBrightness(normalized);
  const isLight = brightness > 0.66;
  const text = isLight ? mixHex(normalized, "#111111", 0.5) : mixHex(normalized, "#ffffff", 0.22);
  return {
    backgroundColor: withAlpha(normalized, isLight ? 0.14 : 0.18),
    color: text,
    borderColor: withAlpha(normalized, 0.25),
  };
}

interface PinChipProps {
  children: React.ReactNode;
  color?: string;
  variant?: "solid" | "outline";
  mono?: boolean;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function PinChip({
  children,
  color,
  variant = "solid",
  mono = false,
  removable = false,
  onClick,
  onRemove,
  className = "",
}: PinChipProps) {
  const computed: React.CSSProperties = color
    ? paletteTagStyle(color)
    : {
        background: "rgba(255,255,255,0.04)",
        color: "rgba(238,240,242,0.78)",
        borderColor: "transparent",
      };

  const border = variant === "outline"
    ? { background: "transparent", borderColor: color ? paletteTagStyle(color).borderColor : "var(--pd-line-strong)" }
    : {};

  return (
    <span
      className={`pd-chip ${mono ? "pd-chip--mono" : ""} ${variant === "outline" ? "pd-chip--outline" : ""} ${className}`}
      style={{
        ...computed,
        ...border,
        cursor: onClick || removable ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      {children}
      {removable && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          style={{ opacity: 0.6, marginLeft: 2 }}
        >
          ×
        </span>
      )}
    </span>
  );
}
