import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PinIcon } from "@/components/ui/pindeck";
import type { Tweaks } from "../TweaksPanel";
import type { Id } from "../../../../convex/_generated/dataModel";

interface DeckComposerProps {
  deckId: Id<"decks">;
  onBack: () => void;
  tweaks: Tweaks;
}

const TEMPLATES = [
  { id: "cinematic", name: "Cinema", desc: "Moody widescreen. Full-bleed stills, letterboxed type." },
  { id: "editorial", name: "Editor", desc: "Serif-led. Magazine rhythm, generous whitespace." },
  { id: "mv", name: "MV", desc: "High-contrast, kinetic type, neon accents." },
  { id: "commercial", name: "Comm", desc: "Product-forward storyboard. Clean grid." },
  { id: "archival", name: "Arch", desc: "Monochrome contact-sheet with callouts." },
];

const SCROLL_FX = [
  { id: "parallax", name: "Parallax", desc: "Image lags, text leads" },
  { id: "snap", name: "Snap", desc: "Wipes in as you enter" },
  { id: "kinetic", name: "Kinetic", desc: "Giant type scrubs across" },
  { id: "dolly", name: "Dolly", desc: "Images push through focus" },
  { id: "sequence", name: "Sequence", desc: "Horizontal strip on vertical scroll" },
];

export function DeckComposer({ deckId, onBack, tweaks }: DeckComposerProps) {
  const deck = useQuery(api.decks.getById, { deckId });
  const updateMeta = useMutation(api.decks.updateMeta);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [logline, setLogline] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [scrollFx, setScrollFx] = useState(SCROLL_FX[0].id);
  const [overlay, setOverlay] = useState(0);
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    if (deck) {
      setTitle(deck.title);
      setSubtitle(deck.subtitle || "");
      setLogline(deck.logline || "");
      const t = TEMPLATES.find((x) => x.id === deck.templateId) || TEMPLATES[0];
      setTemplate(t);
      setScrollFx(deck.scrollFx || "parallax");
      setOverlay(deck.overlay || 0);
      setBlocks(deck.blocks || []);
    }
  }, [deck]);

  const handleSave = async () => {
    await updateMeta({
      deckId,
      title,
      subtitle,
      logline,
      templateId: template.id,
      templateName: template.name,
      scrollFx,
      overlay,
      blocks,
    });
  };

  if (!deck) {
    return (
      <div className="deck-scope pd-fade-in" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>
        Loading deck…
      </div>
    );
  }

  const toggleBlock = (id: string, key: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [key]: !b[key] } : b)));
  };

  return (
    <div className="deck-scope pd-fade-in" style={{ flex: 1, display: "flex", height: "100%", background: "var(--pd-bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 296, flexShrink: 0, background: "var(--pd-bg-1)",
        borderRight: "1px solid var(--pd-line)", height: "100%",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--pd-line)", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} className="btn" style={{ padding: "4px 8px", fontSize: 10.5 }} title="Back to Decks">
            ← Decks
          </button>
          <div className="pd-mono" style={{ fontSize: 9, color: "var(--pd-ink-faint)", letterSpacing: ".2em", marginLeft: 2 }}>COMPOSER</div>
        </div>

        <div className="pd-scroll" style={{ flex: 1, overflow: "auto", padding: "16px 16px 20px" }}>
          <div style={{ marginBottom: 18 }}>
            <div className="section-label">Deck name</div>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled Deck" />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="section-label">Subtitle</div>
            <input className="field" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle…" />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="section-label">Logline</div>
            <textarea className="field" value={logline} onChange={(e) => setLogline(e.target.value)} placeholder="One-line pitch…"
              style={{ height: 60, resize: "none", padding: "8px 9px" }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="section-label"><span>Overlay</span><span style={{ flex: "none" }} /><span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-dim)" }}>{Math.round(overlay * 100)}%</span></div>
            <input type="range" min="0" max="1" step="0.01" value={overlay} onChange={(e) => setOverlay(+e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="section-label">Style</div>
            <div style={{ display: "flex", gap: 4 }}>
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplate(t)} className={`pill ${template.id === t.id ? "is-on" : ""}`} title={t.desc}>
                  {t.name}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--pd-ink-mute)", lineHeight: 1.4, padding: "0 2px" }}>{template.desc}</div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="section-label">Scroll FX</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {SCROLL_FX.map((fx) => (
                <button key={fx.id} onClick={() => setScrollFx(fx.id)} className={`pill ${scrollFx === fx.id ? "is-on" : ""}`} title={fx.desc} style={{ padding: "6px 4px" }}>
                  {fx.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="section-label"><span>Blocks</span><span style={{ flex: "none" }} /><button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 6px" }}>+ Add</button></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {blocks.map((b) => (
                <div key={b.id} className={`block-row ${!b.on ? "is-off" : ""} ${b.locked ? "is-locked" : ""}`}>
                  <span style={{ color: "var(--pd-ink-faint)", display: "flex" }}><PinIcon name="grip" size={12} /></span>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 500, letterSpacing: ".04em", color: b.on ? "var(--pd-ink)" : "var(--pd-ink-mute)" }}>{b.label}</span>
                  <button onClick={() => toggleBlock(b.id, "locked")} style={{ color: b.locked ? "var(--pd-accent)" : "var(--pd-ink-faint)", display: "flex", padding: 3 }}>
                    <PinIcon name={b.locked ? "lock" : "unlock"} size={11} />
                  </button>
                  <button onClick={() => toggleBlock(b.id, "on")} style={{ color: b.on ? "var(--pd-accent)" : "var(--pd-ink-faint)", display: "flex", padding: 3 }}>
                    <PinIcon name={b.on ? "eye" : "eye-off"} size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--pd-line)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn btn-accent" onClick={handleSave} style={{ padding: "10px 12px", justifyContent: "center", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 11 }}>
            <PinIcon name="check" size={11} /> Save Changes
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <button className="btn" style={{ justifyContent: "center" }}><PinIcon name="play" size={11} /> Present</button>
            <button className="btn" style={{ justifyContent: "center" }}><PinIcon name="download" size={11} /> PDF</button>
          </div>
        </div>
      </aside>

      {/* Canvas */}
      <div className="pd-scroll" style={{ flex: 1, overflow: "auto", background: "#050507", padding: "24px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
          {deck.slides?.map((slide: any, i: number) => (
            <div key={i} style={{
              position: "relative", width: "100%", aspectRatio: "16/9",
              background: "#000", border: "1px solid var(--pd-line-strong)",
              borderRadius: 2, overflow: "hidden",
            }}>
              {slide.image?.imageUrl && (
                <img src={slide.image.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.85))",
                padding: "24px 16px 12px",
              }}>
                <div className="pd-mono" style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--pd-accent)", marginBottom: 6 }}>SLIDE {String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{slide.image?.title || "Untitled"}</div>
              </div>
            </div>
          ))}
          {(!deck.slides || deck.slides.length === 0) && (
            <div style={{ textAlign: "center", color: "var(--pd-ink-faint)", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
              <div>No slides yet.</div>
              <div style={{ fontSize: 11, marginTop: 8, color: "var(--pd-ink-mute)" }}>Add images to the source board to generate slides.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
