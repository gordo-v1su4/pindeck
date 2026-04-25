import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinIcon, PinSwatches } from "@/components/ui/pindeck";
import { SmartImage } from "@/components/SmartImage";
import type { Tweaks } from "./TweaksPanel";

interface GalleryViewProps {
  search: string;
  tweaks: Tweaks;
  onOpenImage: (img: any) => void;
}

export function GalleryView({ search, tweaks, onOpenImage }: GalleryViewProps) {
  const images = useQuery(api.images.list, { limit: 200 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!images) return [];
    if (!search) return images;
    const q = search.toLowerCase();
    return images.filter((im) =>
      im.title.toLowerCase().includes(q) ||
      im.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
      im.sref?.toLowerCase().includes(q)
    );
  }, [images, search]);

  const cols = tweaks.density === "dense" ? 5 : 4;
  const gap = tweaks.density === "dense" ? 6 : 10;

  const hoverClass = {
    lift: "pd-card-lift",
    tilt: "pd-card-tilt",
    zoom: "pd-card-zoom",
    flip: "pd-card-flip",
  }[tweaks.hover] || "pd-card-lift";

  const cardStyle = {
    bordered: { background: "var(--pd-panel)", border: "1px solid var(--pd-line)", borderRadius: 4 },
    bare: { background: "transparent", border: "0", borderRadius: 2 },
    glass: { background: "rgba(255,255,255,0.02)", border: "1px solid var(--pd-line-strong)", borderRadius: 6 },
    filmstrip: { background: "#000", border: "1px solid var(--pd-line-strong)", borderRadius: 2, padding: "8px 0" },
  }[tweaks.cardStyle] || { background: "var(--pd-panel)", border: "1px solid var(--pd-line)", borderRadius: 4 };

  if (images === undefined) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>
        <div className="pd-skeleton" style={{ width: 200, height: 20, borderRadius: 4 }} />
      </div>
    );
  }

  return (
    <div className="pd-scroll pd-fade-in" style={{ flex: 1, overflow: "auto", padding: "12px", position: "relative" }}>
      <div style={{ columnCount: cols, columnGap: gap, maxWidth: "100%" }}>
        {filtered.map((img, i) => {
          const isAi = !!img.parentImageId;
          return (
            <div
              key={img._id}
              onClick={() => onOpenImage(img)}
              onMouseEnter={() => setHoveredId(img._id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`${hoverClass} pd-fade-in`}
              style={{
                ...cardStyle,
                cursor: "pointer",
                overflow: "hidden",
                breakInside: "avoid",
                marginBottom: gap,
                animationDelay: `${i * 18}ms`,
              }}
            >
              {tweaks.cardStyle === "filmstrip" && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px 6px", fontSize: 9 }} className="pd-mono">
                  <span style={{ color: "var(--pd-ink-mute)" }}>◯ {String(i + 1).padStart(3, "0")}</span>
                  <span style={{ color: "var(--pd-ink-faint)" }}>{img.sref || "—"}</span>
                </div>
              )}
              <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", overflow: "hidden" }}>
                <SmartImage image={img} variant="card" alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

                <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4 }}>
                  {isAi && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      padding: "2px 5px", borderRadius: 2, fontSize: 9, fontWeight: 600,
                      background: "rgba(0,0,0,0.7)", color: "var(--pd-accent-ink)",
                      border: "1px solid rgba(58,123,255,0.35)", letterSpacing: "0.04em",
                    }} className="pd-mono">
                      <PinIcon name="sparkle" size={8} stroke={2.2} /> VAR
                    </span>
                  )}
                </div>

                <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                  <span className="pd-mono" style={{
                    padding: "2px 5px", fontSize: 9, fontWeight: 600,
                    background: "rgba(0,0,0,0.7)", color: "var(--pd-ink-dim)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2, letterSpacing: "0.04em",
                  }}>{img.style || "16:9"}</span>
                </div>

                <div style={{
                  position: "absolute", left: 0, right: 0, bottom: 0,
                  background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.78) 70%)",
                  padding: "18px 8px 6px", display: "flex", alignItems: "flex-end",
                  justifyContent: "space-between", gap: 8,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 500, color: "var(--pd-ink)", letterSpacing: "-0.01em",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{img.title}</div>
                    <div className="pd-mono" style={{
                      fontSize: 9, color: "var(--pd-ink-faint)", marginTop: 1,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {img.shot || img.category} · {img.style || img.group || "—"}
                    </div>
                  </div>
                  <PinSwatches colors={img.colors?.slice(0, 5) || []} size={7} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
