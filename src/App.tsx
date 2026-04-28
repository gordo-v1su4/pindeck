import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from "react";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { SignInForm } from "@/SignInForm";
import { SignOutButton } from "@/SignOutButton";
import { Toaster } from "sonner";
import { PinIcon, PinHotkey } from "@/components/ui/pindeck";
import { TweaksPanel, DEFAULT_TWEAKS, type Tweaks } from "@/components/pd/TweaksPanel";
import { GalleryView } from "@/components/pd/GalleryView";
import { TableView } from "@/components/pd/TableView";
import { BoardsView } from "@/components/pd/BoardsView";
import { DecksGallery } from "@/components/pd/deck/DecksGallery";
import { ImageDetailDrawer } from "@/components/pd/ImageDetailDrawer";
import type { Id } from "../convex/_generated/dataModel";
import { applyPindeckTweaksToDocument } from "@/lib/pdTheme";

const ImageUploadForm = lazy(() =>
  import("@/components/ImageUploadForm").then((mod) => ({ default: mod.ImageUploadForm }))
);
const DeckComposer = lazy(() =>
  import("@/components/pd/deck/DeckComposer").then((mod) => ({ default: mod.DeckComposer }))
);

const APP_VIEWS = [
  { id: "gallery", label: "Gallery", icon: "masonry", hk: "G" },
  { id: "table", label: "Table", icon: "table", hk: "T" },
  { id: "boards", label: "Boards", icon: "board", hk: "B" },
  { id: "deck", label: "Decks", icon: "deck", hk: "D" },
  { id: "upload", label: "Upload", icon: "upload", hk: "U" },
] as const;

export default function App() {
  const [tweaks, setTweaks] = useState<Tweaks>(() => {
    try {
      const saved = localStorage.getItem("pindeck_tweaks");
      return saved ? { ...DEFAULT_TWEAKS, ...JSON.parse(saved) } : DEFAULT_TWEAKS;
    } catch {
      return DEFAULT_TWEAKS;
    }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem("pindeck_view") || "gallery");
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [activeDeckId, setActiveDeckId] = useState<Id<"decks"> | null>(null);
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    localStorage.setItem("pindeck_tweaks", JSON.stringify(tweaks));
  }, [tweaks]);

  /* useLayoutEffect: avoid one frame where .pd-* accent is wrong before paint */
  useLayoutEffect(() => {
    applyPindeckTweaksToDocument({
      accent: tweaks.accent,
      typography: tweaks.typography,
    });
  }, [tweaks.accent, tweaks.typography]);

  useEffect(() => {
    localStorage.setItem("pindeck_view", view);
  }, [view]);

  useEffect(() => {
    if (view !== "deck") setActiveDeckId(null);
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") { setSelectedImage(null); setTweaksOpen(false); }
      if (e.key === "g") setView("gallery");
      if (e.key === "t") setView("table");
      if (e.key === "b") setView("boards");
      if (e.key === "d") setView("deck");
      if (e.key === "u") setView("upload");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openDeck = (deckId: Id<"decks">) => {
    setActiveDeckId(deckId);
    setView("deck");
  };

  const showAppChrome = isAuthenticated;

  return (
    <div
      className={`pd-theme ${tweaks.grain ? "pd-grain" : ""}`}
      style={{
        height: "100vh",
        display: "flex",
        background: "var(--pd-bg)",
        position: "relative",
        color: "var(--pd-ink)",
        fontFamily: "var(--pd-font-sans)",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {showAppChrome && (
        <Sidebar activeView={view} onView={setView} />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {showAppChrome && (
          <Topbar
            search={search}
            setSearch={setSearch}
            view={view}
            setView={setView}
            tweaksOn={tweaksOpen}
            onToggleTweaks={() => setTweaksOpen(!tweaksOpen)}
          />
        )}

        <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative", alignItems: "stretch" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Unauthenticated>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SignInForm />
              </div>
            </Unauthenticated>
            <Authenticated>
              {view === "gallery" && (
                <GalleryView search={search} tweaks={tweaks} onOpenImage={setSelectedImage} />
              )}
              {view === "table" && (
                <TableView search={search} onOpenImage={setSelectedImage} />
              )}
              {view === "boards" && (
                <BoardsView onOpenDeck={openDeck} />
              )}
              {view === "deck" && !activeDeckId && (
                <DecksGallery onOpenDeck={openDeck} tweaks={tweaks} />
              )}
              {view === "deck" && activeDeckId && (
                <Suspense fallback={<Placeholder />}>
                  <DeckComposer deckId={activeDeckId} onBack={() => setActiveDeckId(null)} tweaks={tweaks} />
                </Suspense>
              )}
              {view === "upload" && (
                <Suspense fallback={<Placeholder />}>
                  <ImageUploadForm />
                </Suspense>
              )}
            </Authenticated>
          </div>

          {selectedImage && (
            <ImageDetailDrawer image={selectedImage} onClose={() => setSelectedImage(null)} tweaks={tweaks} />
          )}
        </div>

        {tweaksOpen && (
          <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />
        )}

        {showAppChrome && (
          <div className="pd-mono" style={{
            position: "fixed", bottom: 0, left: 208, right: 0, height: 22,
            background: "var(--pd-bg-1)", borderTop: "1px solid var(--pd-line)",
            display: "flex", alignItems: "center", padding: "0 10px", gap: 10,
            fontSize: 10, color: "var(--pd-ink-faint)", zIndex: 5,
          }}>
            <span><span style={{ color: "var(--pd-green)" }}>●</span> convex · live</span>
            <span>·</span>
            <span>{view}</span>
            <div style={{ flex: 1 }} />
            <span>accent {tweaks.accent}</span>
            <span>·</span>
            <span>{tweaks.density}</span>
            <span>·</span>
            <span>{tweaks.cardStyle}</span>
          </div>
        )}
      </div>

      <Toaster theme="dark" />
    </div>
  );
}

function Sidebar({ activeView, onView }: { activeView: string; onView: (v: string) => void }) {
  return (
    <aside style={{
      width: 208, flexShrink: 0, background: "var(--pd-bg-1)",
      borderRight: "1px solid var(--pd-line)", display: "flex", flexDirection: "column",
      height: "100%", position: "relative", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--pd-line)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4, background: "#000",
          border: "1px solid var(--pd-line-hi)", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.06em",
        }}>P/</div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.03em", fontStyle: "italic" }}>
          <span style={{ color: "var(--pd-ink)" }}>PIN</span>
          <span style={{ color: "var(--pd-accent)" }}>DECK</span>
        </div>
      </div>

      <div style={{ padding: "10px 8px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
        {APP_VIEWS.map((n) => (
          <button key={n.id} onClick={() => onView(n.id)} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "6px 8px",
            borderRadius: 4, color: activeView === n.id ? "var(--pd-ink)" : "var(--pd-ink-dim)",
            background: activeView === n.id ? "rgba(255,255,255,0.05)" : "transparent",
            fontSize: 12, fontWeight: 500, textAlign: "left", transition: "background 120ms",
          }}>
            <PinIcon name={n.icon} size={13} stroke={activeView === n.id ? 1.8 : 1.5} />
            <span style={{ flex: 1 }}>{n.label}</span>
            <PinHotkey k={n.hk} />
          </button>
        ))}
      </div>

      <div className="pd-scroll" style={{ flex: 1, overflow: "auto", padding: "8px 12px 14px" }}>
        <Authenticated>
          <div style={{ padding: "8px 4px 4px" }}>
            <div className="pd-mono" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pd-ink-faint)", marginBottom: 8 }}>Filters</div>
            <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 11.5, color: "var(--pd-ink-dim)", cursor: "pointer" }}>
              <input type="checkbox" /> Originals only
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 11.5, color: "var(--pd-ink-dim)", cursor: "pointer" }}>
              <input type="checkbox" /> Has sref
            </label>
          </div>
        </Authenticated>
      </div>

      <div style={{ borderTop: "1px solid var(--pd-line)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 10.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-green)", boxShadow: "0 0 8px var(--pd-green)" }} />
        <span className="pd-mono" style={{ color: "var(--pd-ink-mute)" }}>convex · live</span>
        <div style={{ flex: 1 }} />
        <SignOutButton />
      </div>
    </aside>
  );
}

function Topbar({ search, setSearch, view, setView, tweaksOn, onToggleTweaks }: {
  search: string; setSearch: (s: string) => void; view: string; setView: (v: string) => void;
  tweaksOn: boolean; onToggleTweaks: () => void;
}) {
  return (
    <header style={{
      height: 44, flexShrink: 0, borderBottom: "1px solid var(--pd-line)",
      background: "var(--pd-bg-1)", display: "flex", alignItems: "center", gap: 8,
      padding: "0 12px", position: "relative", zIndex: 10,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "var(--pd-bg-2)", border: "1px solid var(--pd-line)",
        borderRadius: 5, padding: "5px 8px", width: 320, maxWidth: "38vw",
      }}>
        <PinIcon name="search" size={12} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, tags, srefs…"
          style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 12, color: "var(--pd-ink)" }} />
        <PinHotkey k="⌘K" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--pd-ink-mute)", marginLeft: 8 }}>
        <span className="pd-mono">{view}</span>
        <span style={{ color: "var(--pd-ink-faint)" }}>/</span>
        <span>Pindeck Library</span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 2, border: "1px solid var(--pd-line)", borderRadius: 5, padding: 1 }}>
        {[
          { id: "gallery", icon: "masonry", label: "Gallery" },
          { id: "table", icon: "table", label: "Table" },
          { id: "boards", icon: "board", label: "Boards" },
        ].map((v) => (
          <button key={v.id} onClick={() => setView(v.id)} title={v.label} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "4px 8px",
            borderRadius: 4, fontSize: 11, fontWeight: 500,
            color: view === v.id ? "var(--pd-ink)" : "var(--pd-ink-dim)",
            background: view === v.id ? "rgba(255,255,255,0.06)" : "transparent",
          }}>
            <PinIcon name={v.icon} size={12} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      <button onClick={onToggleTweaks} title="Tweaks" style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4, border: "1px solid var(--pd-line)",
        background: tweaksOn ? "var(--pd-accent-soft)" : "transparent",
        color: tweaksOn ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
      }}>
        <PinIcon name="bolt" size={13} />
      </button>
    </header>
  );
}

function Placeholder() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)", fontSize: 12 }}>
      <div style={{ textAlign: "center" }}>
        <PinIcon name="film" size={28} stroke={1.2} />
        <div style={{ marginTop: 10 }}>Loading…</div>
      </div>
    </div>
  );
}
