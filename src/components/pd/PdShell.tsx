import { useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Chip, Hotkey, Icon, Label } from "./primitives";
import { SignOutButton } from "@/SignOutButton";

export type PdView = "gallery" | "upload" | "boards" | "deck" | "table";

const NAV: Array<{ id: PdView; label: string; icon: "masonry" | "table" | "board" | "deck" | "upload"; hk: string }> = [
  { id: "gallery", label: "Gallery", icon: "masonry", hk: "G" },
  { id: "table", label: "Table", icon: "table", hk: "T" },
  { id: "boards", label: "Boards", icon: "board", hk: "B" },
  { id: "deck", label: "Decks", icon: "deck", hk: "D" },
  { id: "upload", label: "Upload", icon: "upload", hk: "U" },
];

export function PdShell({
  activeView,
  onView,
  search,
  setSearch,
  selectedCategory,
  onCategoryChange,
  tweaksOn = false,
  onToggleTweaks,
  children,
}: {
  activeView: PdView;
  onView: (v: PdView) => void;
  search: string;
  setSearch: (s: string) => void;
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  tweaksOn?: boolean;
  onToggleTweaks?: () => void;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--pd-bg)", color: "var(--pd-ink)" }}>
      <PdSidebar
        activeView={activeView}
        onView={onView}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        <PdTopbar
          search={search}
          setSearch={setSearch}
          view={activeView}
          setView={onView}
          tweaksOn={tweaksOn}
          onToggleTweaks={onToggleTweaks}
        />
        <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function PdSidebar({
  activeView, onView, selectedCategory, onCategoryChange,
}: {
  activeView: PdView;
  onView: (v: PdView) => void;
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
}) {
  const categories = useQuery(api.images.getCategories);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      const map: Record<string, PdView> = { g: "gallery", t: "table", b: "boards", d: "deck", u: "upload" };
      const v = map[e.key.toLowerCase()];
      if (v) onView(v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onView]);

  return (
    <aside style={{
      width: 208,
      flexShrink: 0,
      background: "var(--pd-bg-1)",
      borderRight: "1px solid var(--pd-line)",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflow: "hidden",
      zIndex: 30,
    }}>
      {/* Brand */}
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--pd-line)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4, background: "#000",
          border: "1px solid var(--pd-line-hi)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.06em",
          color: "#fff",
        }}>P/</div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.03em", fontStyle: "italic" }}>
          <span style={{ color: "var(--pd-ink)" }}>PIN</span>
          <span style={{ color: "var(--pd-accent)" }}>DECK</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: "10px 8px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => onView(n.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "6px 8px",
              borderRadius: 4,
              color: activeView === n.id ? "var(--pd-ink)" : "var(--pd-ink-dim)",
              background: activeView === n.id ? "rgba(255,255,255,0.05)" : "transparent",
              fontSize: 12,
              fontWeight: 500,
              textAlign: "left",
              transition: "background 120ms",
              border: 0,
              cursor: "pointer",
            }}
          >
            <Icon name={n.icon} size={13} stroke={activeView === n.id ? 1.8 : 1.5} />
            <span style={{ flex: 1 }}>{n.label}</span>
            <Hotkey k={n.hk} />
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="pd-scroll" style={{ flex: 1, overflow: "auto", padding: "8px 12px 14px" }}>
        {categories && categories.length > 0 && (
          <div style={{ padding: "8px 4px 4px" }}>
            <Label>Category</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              <Chip
                variant={!selectedCategory ? "solid" : "outline"}
                active={!selectedCategory}
                onClick={() => onCategoryChange(undefined)}
              >
                All
              </Chip>
              {categories.map((c) => (
                <Chip
                  key={c}
                  variant={selectedCategory === c ? "solid" : "outline"}
                  active={selectedCategory === c}
                  onClick={() => onCategoryChange(selectedCategory === c ? undefined : c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid var(--pd-line)",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 10.5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-green)", boxShadow: "0 0 8px var(--pd-green)" }} />
        <span className="pd-mono" style={{ color: "var(--pd-ink-mute)" }}>convex · live</span>
      </div>
    </aside>
  );
}

function PdTopbar({
  search, setSearch, view, setView, tweaksOn, onToggleTweaks,
}: {
  search: string;
  setSearch: (s: string) => void;
  view: PdView;
  setView: (v: PdView) => void;
  tweaksOn?: boolean;
  onToggleTweaks?: () => void;
}) {
  const totalImages = useQuery(api.images.list, {});
  const imageCount = totalImages?.length ?? 0;
  const deckList = useQuery(api.decks.list);
  const deckCount = deckList?.length ?? 0;

  const viewToggles = useMemo(() => ([
    { id: "gallery" as const, icon: "masonry" as const, label: "Gallery" },
    { id: "table" as const, icon: "table" as const, label: "Table" },
    { id: "boards" as const, icon: "board" as const, label: "Boards" },
    { id: "deck" as const, icon: "deck" as const, label: "Decks" },
    { id: "upload" as const, icon: "upload" as const, label: "Upload" },
  ]), []);

  return (
    <header style={{
      height: 44,
      flexShrink: 0,
      borderBottom: "1px solid var(--pd-line)",
      background: "var(--pd-bg-1)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 12px",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      {/* Search */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--pd-bg-2)",
        border: "1px solid var(--pd-line)",
        borderRadius: 5,
        padding: "5px 8px",
        width: 320,
        maxWidth: "38vw",
      }}>
        <Icon name="search" size={12} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, tags, srefs…"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: "transparent",
            fontSize: 12,
            color: "var(--pd-ink)",
          }}
        />
        <Hotkey k="⌘K" />
      </div>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--pd-ink-mute)", marginLeft: 8 }}>
        {view === "deck" ? (
          <>
            <span className="pd-mono">decks</span>
            <span style={{ color: "var(--pd-ink-faint)" }}>/</span>
            <span>
              {deckList === undefined ? "…" : `${deckCount} deck${deckCount === 1 ? "" : "s"}`}
            </span>
          </>
        ) : (
          <>
            <span className="pd-mono">{view}</span>
            <span style={{ color: "var(--pd-ink-faint)" }}>/</span>
            <span>{imageCount} images</span>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* View toggles */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, border: "1px solid var(--pd-line)", borderRadius: 5, padding: 1 }}>
        {viewToggles.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            title={v.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              color: view === v.id ? "var(--pd-ink)" : "var(--pd-ink-dim)",
              background: view === v.id ? "rgba(255,255,255,0.06)" : "transparent",
              border: 0,
              cursor: "pointer",
            }}
          >
            <Icon name={v.icon} size={12} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {onToggleTweaks && (
        <button
          onClick={onToggleTweaks}
          title="Tweaks"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            border: "1px solid var(--pd-line)",
            background: tweaksOn ? "var(--pd-accent-soft)" : "transparent",
            color: tweaksOn ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
            cursor: "pointer",
          }}
        >
          <Icon name="bolt" size={13} />
        </button>
      )}

      <div style={{ width: 1, height: 20, background: "var(--pd-line)" }} />

      <SignOutButton />
    </header>
  );
}
