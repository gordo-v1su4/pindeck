import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PinBtn } from "@/components/ui/pindeck";
import type { Tweaks } from "../TweaksPanel";
import type { Id } from "../../../../convex/_generated/dataModel";

interface DecksGalleryProps {
  onOpenDeck: (deckId: Id<"decks">) => void;
  tweaks: Tweaks;
}

export function DecksGallery({ onOpenDeck, tweaks }: DecksGalleryProps) {
  const decks = useQuery(api.decks.list);
  const [hoveredId, setHoveredId] = useState<Id<"decks"> | null>(null);

  if (decks === undefined) {
    return (
      <div
        className="pd-fade-in"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--pd-ink-faint)",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="pd-scroll pd-fade-in" style={{ padding: "22px 26px 40px", height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Decks</div>
          <div
            className="pd-mono"
            style={{ fontSize: 10.5, color: "var(--pd-ink-faint)", letterSpacing: ".16em", marginTop: 3 }}
          >
            {decks.length} DECKS · CLICK TO OPEN
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <PinBtn variant="outline">⟲ Import</PinBtn>
          <PinBtn variant="accent">+ New Deck</PinBtn>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "28px 22px",
          alignItems: "start",
        }}
      >
        {decks.map((d) => {
          const hovered = hoveredId === d._id;
          const nBlocks =
            typeof d.blocks?.length === "number"
              ? d.blocks.length
              : Array.isArray(d.slides)
                ? d.slides.length
                : 0;
          return (
            <button
              key={d._id}
              type="button"
              onClick={() => onOpenDeck(d._id)}
              onMouseEnter={() => setHoveredId(d._id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                textAlign: "left",
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontFamily: "inherit",
                color: "inherit",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                  minHeight: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span
                    title="accent"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: tweaks.accent,
                      boxShadow: `0 0 8px ${tweaks.accent}`,
                      flexShrink: 0,
                    }}
                  />
                  <span className="pd-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--pd-ink-mute)" }}>
                    {d.tag ?? "ACTIVE"}
                  </span>
                  <span className="pd-mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--pd-ink-faint)" }}>
                    · {nBlocks || "—"} BLOCKS
                  </span>
                </div>
              </div>

              <div
                style={{
                  aspectRatio: "9 / 22",
                  border: "1px solid",
                  transition: "border-color .2s, transform .25s, box-shadow .25s, color .2s",
                  transform: hovered ? "translateY(-2px)" : "none",
                  borderColor: hovered ? "var(--pd-accent)" : "var(--pd-line-strong)",
                  boxShadow: hovered ? "0 20px 40px -20px rgba(0,0,0,0.75)" : "none",
                  background: "#050507",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  color: hovered ? "var(--pd-accent-ink)" : "var(--pd-ink-mute)",
                }}
              >
                <div style={{ fontSize: 40, fontWeight: 200, lineHeight: 1 }}>🎬</div>
                <div className="pd-mono" style={{ fontSize: 10, letterSpacing: ".24em" }}>
                  OPEN DECK
                </div>
              </div>
              <div>
                <div className="pd-mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--pd-ink-faint)", marginBottom: 4 }}>
                  PITCH DECK
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--pd-ink)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                  {d.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--pd-ink-dim)", marginTop: 2, letterSpacing: "-0.005em", lineHeight: 1.3 }}>
                  {d.subtitle || d.templateName || d.templateId || "Untitled"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
