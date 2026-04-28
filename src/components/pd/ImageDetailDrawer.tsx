import React, { useState } from "react";
import { PinIcon, PinChip, PinBtn, PinKV } from "@/components/ui/pindeck";
import type { Tweaks } from "../TweaksPanel";

interface ImageDetailDrawerProps {
  image: any;
  onClose: () => void;
  tweaks: Tweaks;
}

export function ImageDetailDrawer({ image, onClose, tweaks }: ImageDetailDrawerProps) {
  const [tab, setTab] = useState("edit");

  const fmtSref = (s: string | undefined) => {
    if (!s) return "—";
    const match = s.match(/\d+/);
    return match ? `--sref ${match[0]}` : "—";
  };

  const tabs = [
    { id: "edit", label: "Edit", icon: "edit" },
    { id: "variations", label: "Variations", icon: "sparkle" },
    { id: "lineage", label: "Lineage", icon: "tree" },
  ];

  return (
    <aside className="pd-slide-in pd-scroll" style={{
      width: 440, flexShrink: 0, minHeight: 0, alignSelf: "stretch",
      overflow: "auto",
      background: "var(--pd-panel)", borderLeft: "1px solid var(--pd-line)",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      <div style={{
        padding: "12px 14px 10px", borderBottom: "1px solid var(--pd-line)",
        display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0,
        background: "var(--pd-panel)", zIndex: 2,
      }}>
        <button onClick={onClose} style={{
          width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 3, color: "var(--pd-ink-dim)", border: "1px solid var(--pd-line)",
        }}>
          <PinIcon name="close" size={12} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--pd-ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{image.title}</div>
          <div className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)", letterSpacing: "0.04em" }}>
            {image._id} · {image.sref || "—"}
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 14px 0" }}>
        <div
          className="pd-letterbox"
          style={
            {
              borderRadius: 3,
              overflow: "hidden",
              background: "#000",
              aspectRatio: "16/9",
              position: "relative",
              "--pd-lb": tweaks.letterbox ? "14px" : "0px",
            } as React.CSSProperties
          }
        >
          <img src={image.imageUrl} alt={image.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4 }}>
            <PinChip mono variant="outline">{image.category}</PinChip>
            <PinChip mono variant="outline">{image.group || "—"}</PinChip>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 0, borderRadius: 3, overflow: "hidden", height: 18 }}>
          {image.colors?.map((c: string, i: number) => (
            <div key={i} style={{ flex: 1, background: c, position: "relative" }} title={c}>
              <span className="pd-mono" style={{
                position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                fontSize: 9, color: "var(--pd-ink-faint)", marginTop: 3, whiteSpace: "nowrap",
              }}>{c.toUpperCase().slice(1, 4)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, padding: "16px 0 10px", fontSize: 11, color: "var(--pd-ink-mute)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PinIcon name="eye" size={11} /> {image.views}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PinIcon name="heart" size={11} /> {image.likes}</span>
          <div style={{ flex: 1 }} />
          <span className="pd-mono" style={{ color: "var(--pd-ink-faint)" }}>{image.projectName || "—"}</span>
        </div>
      </div>

      <div style={{ padding: "0 14px", borderBottom: "1px solid var(--pd-line)", display: "flex", gap: 0 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "8px 10px",
            borderBottom: tab === t.id ? "1.5px solid var(--pd-accent)" : "1.5px solid transparent",
            color: tab === t.id ? "var(--pd-ink)" : "var(--pd-ink-mute)",
            fontSize: 12, fontWeight: 500, marginBottom: -1,
          }}>
            <PinIcon name={t.icon} size={11} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "14px" }}>
        {tab === "edit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)",
                textTransform: "uppercase", display: "block", marginBottom: 5, fontWeight: 500,
              }}>Title</label>
              <input defaultValue={image.title} style={{
                width: "100%", height: 30, padding: "0 10px",
                background: "rgba(255,255,255,0.025)", color: "var(--pd-ink)",
                border: "1px solid var(--pd-line-strong)", borderRadius: 4,
                fontSize: 12, outline: "none",
              }} />
            </div>
            <div>
              <label className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)",
                textTransform: "uppercase", display: "block", marginBottom: 5, fontWeight: 500,
              }}>Tags ({image.tags?.length || 0})</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: 28, marginBottom: 6 }}>
                {image.tags?.map((t: string, i: number) => (
                  <PinChip key={t} color={image.colors?.[i % (image.colors?.length || 1)]} removable>{t}</PinChip>
                ))}
              </div>
            </div>
            <div style={{
              background: "var(--pd-bg-2)", border: "1px solid var(--pd-line)",
              borderRadius: 4, padding: "2px 10px",
            }}>
              <PinKV k="SREF" v={fmtSref(image.sref)} />
              <PinKV k="Category" v={image.category} />
              <PinKV k="Group" v={image.group || "—"} />
              <PinKV k="Project" v={image.projectName || "—"} />
              <PinKV k="Source" v={image.source || "—"} />
            </div>
          </div>
        )}
        {tab === "variations" && (
          <div style={{ color: "var(--pd-ink-faint)", fontSize: 12, textAlign: "center", padding: 24 }}>
            Variations panel — connect to generation API
          </div>
        )}
        {tab === "lineage" && (
          <div style={{ color: "var(--pd-ink-faint)", fontSize: 12, textAlign: "center", padding: 24 }}>
            Lineage tree — show parent/child relationships
          </div>
        )}
      </div>
    </aside>
  );
}
