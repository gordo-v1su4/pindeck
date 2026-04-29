import React from "react";
import { PinLabel, PinIcon } from "@/components/ui/pindeck";

export interface Tweaks {
  accent: string;
  density: "dense" | "cozy" | "comfortable";
  cardStyle: "bordered" | "bare" | "glass" | "filmstrip";
  typography: string;
  hover: "lift" | "tilt" | "zoom" | "flip";
  letterbox: boolean;
  grain: boolean;
  showTweaks: boolean;
}

export const DEFAULT_TWEAKS: Tweaks = {
  accent: "#3a7bff",
  density: "comfortable",
  cardStyle: "bordered",
  typography: "archivo",
  hover: "lift",
  letterbox: false,
  grain: true,
  showTweaks: false,
};

const ACCENTS = [
  { id: "#3a7bff", name: "Indigo" },
  { id: "#5b8def", name: "Cobalt" },
  { id: "#22b8cf", name: "Cyan" },
  { id: "#f5a524", name: "Amber" },
  { id: "#ef4343", name: "Red" },
  { id: "#d946ef", name: "Magenta" },
  { id: "#2ee6a6", name: "Mint" },
  { id: "#a855f7", name: "Violet" },
];

const FONTS = [
  { id: "geist", label: "Geist × Geist Mono", css: "'Geist', sans-serif", mono: "'Geist Mono', monospace" },
  { id: "inter", label: "Inter × JetBrains", css: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  { id: "archivo", label: "Archivo × DM Mono", css: "'Archivo', sans-serif", mono: "'DM Mono', monospace" },
  { id: "space", label: "Space Grotesk × Mono", css: "'Space Grotesk', sans-serif", mono: "'JetBrains Mono', monospace" },
];

interface TweaksPanelProps {
  tweaks: Tweaks;
  setTweaks: (t: Tweaks) => void;
  onClose: () => void;
}

export function TweaksPanel({ tweaks, setTweaks, onClose }: TweaksPanelProps) {
  const set = (k: keyof Tweaks, v: unknown) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
  };

  const row = (label: string, children: React.ReactNode) => (
    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--pd-glass-line)" }}>
      <PinLabel>{label}</PinLabel>
      {children}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 52,
        right: 12,
        width: 280,
        zIndex: 50,
        overflow: "hidden",
      }}
      className="pd-glass-panel pd-fade-in"
    >
      <div
        className="pd-glass-header"
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <PinIcon name="bolt-fill" size={12} />
        <div style={{ fontSize: 12, fontWeight: 600 }}>Tweaks</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--pd-ink-mute)",
            borderRadius: 4,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <PinIcon name="close" size={11} />
        </button>
      </div>

      {row(
        "Accent",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4 }}>
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => set("accent", a.id)}
              title={a.name}
              style={{
                aspectRatio: "1",
                background: a.id,
                borderRadius: 3,
                border: "1.5px solid",
                borderColor: tweaks.accent === a.id ? "var(--pd-ink)" : "transparent",
                boxShadow:
                  tweaks.accent === a.id ? `0 0 0 2px rgba(0,0,0,0.8) inset` : "none",
              }}
            />
          ))}
        </div>
      )}

      {row(
        "Density",
        <div style={{ display: "flex", gap: 4 }}>
          {(["dense", "cozy", "comfortable"] as const).map((d) => (
            <button
              key={d}
              onClick={() => set("density", d)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 3,
                fontSize: 11,
                border: "1px solid",
                borderColor: tweaks.density === d ? "var(--pd-accent)" : "var(--pd-line-strong)",
                background: tweaks.density === d ? "var(--pd-accent-soft)" : "transparent",
                color: tweaks.density === d ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {row(
        "Card style",
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {([
            { id: "bordered", label: "Bordered" },
            { id: "bare", label: "Bare" },
            { id: "glass", label: "Glass" },
            { id: "filmstrip", label: "Filmstrip" },
          ] as const).map((c) => (
            <button
              key={c.id}
              onClick={() => set("cardStyle", c.id)}
              style={{
                padding: "6px 0",
                borderRadius: 3,
                fontSize: 11,
                border: "1px solid",
                borderColor:
                  tweaks.cardStyle === c.id ? "var(--pd-accent)" : "var(--pd-line-strong)",
                background: tweaks.cardStyle === c.id ? "var(--pd-accent-soft)" : "transparent",
                color: tweaks.cardStyle === c.id ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {row(
        "Typography",
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => set("typography", f.id)}
              style={{
                padding: "6px 8px",
                borderRadius: 3,
                fontSize: 11,
                textAlign: "left",
                border: "1px solid",
                borderColor:
                  tweaks.typography === f.id ? "var(--pd-accent)" : "var(--pd-line-strong)",
                background: tweaks.typography === f.id ? "var(--pd-accent-soft)" : "transparent",
                color: tweaks.typography === f.id ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
                fontFamily: f.css,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {row(
        "Hover",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
          {(["lift", "tilt", "zoom", "flip"] as const).map((h) => (
            <button
              key={h}
              onClick={() => set("hover", h)}
              style={{
                padding: "5px 0",
                borderRadius: 3,
                fontSize: 11,
                border: "1px solid",
                borderColor: tweaks.hover === h ? "var(--pd-accent)" : "var(--pd-line-strong)",
                background: tweaks.hover === h ? "var(--pd-accent-soft)" : "transparent",
                color: tweaks.hover === h ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
              }}
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {row(
        "Cinema",
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11.5,
              color: "var(--pd-ink-dim)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={tweaks.letterbox}
              onChange={(e) => set("letterbox", e.target.checked)}
            />
            Letterbox cards
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11.5,
              color: "var(--pd-ink-dim)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={tweaks.grain}
              onChange={(e) => set("grain", e.target.checked)}
            />
            Film grain
          </label>
        </div>
      )}
    </div>
  );
}
