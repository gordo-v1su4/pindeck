import React, { Component, useState, useEffect, useLayoutEffect, lazy, Suspense } from "react";
import { AuthLoading, Authenticated, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "@/SignInForm";
import { SignOutButton } from "@/SignOutButton";
import { Toaster } from "sonner";
import { PinIcon, PinHotkey } from "@/components/ui/pindeck";
import { defaultLibraryFilters, normalizeLibraryGroup, type LibraryFilters } from "@/lib/libraryFilters";
import { TweaksPanel, DEFAULT_TWEAKS, type Tweaks } from "@/components/pd/TweaksPanel";
import { GalleryView } from "@/components/pd/GalleryView";
import { TableView } from "@/components/pd/TableView";
import { BoardsView } from "@/components/pd/BoardsView";
import { ImageDetailDrawer } from "@/components/pd/ImageDetailDrawer";
import type { Id } from "../convex/_generated/dataModel";
import { applyPindeckTweaksToDocument } from "@/lib/pdTheme";
import {
  LibraryAggregationChipWrap,
  LibraryAggregationFacetChip,
  LibraryAggregationSectionHeading,
  LibraryAggregationTypeColumn,
  LibraryAggregationTypeRowButton,
} from "@/components/pd/LibraryAggregationFilterParts";

const ImageUploadForm = lazy(() =>
  import("@/components/ImageUploadForm").then((mod) => ({ default: mod.ImageUploadForm }))
);
/** Decks UI from `claude/redesign` — library strip + composer (see `src/components/DeckView.tsx`). */
const DeckView = lazy(() =>
  import("@/components/DeckView").then((mod) => ({ default: mod.DeckView }))
);

const APP_VIEWS = [
  { id: "gallery", label: "Gallery", icon: "masonry", hk: "G" },
  { id: "table", label: "Table", icon: "table", hk: "T" },
  { id: "boards", label: "Boards", icon: "board", hk: "B" },
  { id: "deck", label: "Decks", icon: "deck", hk: "D" },
  { id: "upload", label: "Upload", icon: "upload", hk: "U" },
] as const;

type AppViewId = (typeof APP_VIEWS)[number]["id"];

const VALID_VIEW_IDS = new Set<string>(APP_VIEWS.map((v) => v.id));

function sanitizeStoredView(raw: string | null): AppViewId {
  if (raw && VALID_VIEW_IDS.has(raw)) return raw as AppViewId;
  return "gallery";
}

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
  const [view, setView] = useState<AppViewId>(() =>
    sanitizeStoredView(localStorage.getItem("pindeck_view")),
  );
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [activeDeckId, setActiveDeckId] = useState<Id<"decks"> | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilters>(defaultLibraryFilters);
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

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

  /** While Convex auth is loading, `Authenticated` / `Unauthenticated` render null — show `AuthLoading` instead. */
  const showAppChrome = isAuthenticated && !authLoading;

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
        <Sidebar
          activeView={view}
          onView={(v) => setView(sanitizeStoredView(v))}
          libraryFilter={libraryFilter}
          setLibraryFilter={setLibraryFilter}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {showAppChrome && (
          <Topbar
            search={search}
            setSearch={setSearch}
            view={view}
            setView={(v) => setView(sanitizeStoredView(v))}
            tweaksOn={tweaksOpen}
            onToggleTweaks={() => setTweaksOpen(!tweaksOpen)}
            accountActions={<SignOutButton />}
          />
        )}

        <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative", alignItems: "stretch" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <AuthLoading>
              <div
                className="pd-fade-in"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 0,
                  color: "var(--pd-ink-faint)",
                  fontSize: 12,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <PinIcon name="film" size={28} stroke={1.2} />
                  <div className="pd-mono" style={{ marginTop: 12, letterSpacing: "0.06em" }}>
                    Loading session…
                  </div>
                </div>
              </div>
            </AuthLoading>
            <Unauthenticated>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SignInForm />
              </div>
            </Unauthenticated>
            <Authenticated>
              {view === "gallery" && (
                <GalleryView
                  search={search}
                  tweaks={tweaks}
                  onOpenImage={setSelectedImage}
                  libraryFilter={libraryFilter}
                  onNavigateToBoards={() => setView("boards")}
                />
              )}
              {view === "table" && (
                <TableView search={search} onOpenImage={setSelectedImage} libraryFilter={libraryFilter} />
              )}
              {view === "boards" && (
                <BoardsView onOpenDeck={openDeck} />
              )}
              {view === "deck" && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <Suspense fallback={<Placeholder />}>
                    <DeckView
                      selectedDeckId={activeDeckId}
                      onSelectDeck={setActiveDeckId}
                      onStartFromGallery={() => setView("gallery")}
                    />
                  </Suspense>
                </div>
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

/** When `libraryAggregations` errors (e.g. Convex not redeployed), don't blank the shell. */
class LibraryAggregationsErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("[Pindeck] libraryAggregations failed — deploy Convex?", e);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function SidebarFilterControls({
  libraryFilter,
  setLibraryFilter,
}: {
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          marginBottom: 6,
        }}
      >
        <div
          className="pd-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--pd-ink-faint)",
          }}
        >
          Filters
        </div>
        <button
          type="button"
          className="pd-mono"
          onClick={() => setLibraryFilter(defaultLibraryFilters())}
          style={{
            fontSize: 9,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            background: "transparent",
            border: "none",
            color: "var(--pd-ink-faint)",
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          Clear
        </button>
      </div>
      <label className="pd-filter-checkbox" style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 11.5, color: "var(--pd-ink-dim)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={libraryFilter.originalsOnly}
          onChange={(e) =>
            setLibraryFilter((f) => ({ ...f, originalsOnly: e.target.checked }))
          }
        />
        <span className="pd-filter-checkbox-box" aria-hidden="true" />
        Originals only
      </label>
      <label className="pd-filter-checkbox" style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 11.5, color: "var(--pd-ink-dim)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={libraryFilter.hasSref}
          onChange={(e) =>
            setLibraryFilter((f) => ({ ...f, hasSref: e.target.checked }))
          }
        />
        <span className="pd-filter-checkbox-box" aria-hidden="true" />
        Has sref
      </label>
    </>
  );
}

function SidebarLibraryAggregationBody({
  libraryFilter,
  setLibraryFilter,
}: {
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
}) {
  const aggregations = useQuery(api.images.libraryAggregations);
  const groupRows = React.useMemo(() => {
    if (!aggregations) return [];
    const counts = new Map<string, number>();
    for (const row of aggregations.byGroup) {
      const value = normalizeLibraryGroup(row.value);
      counts.set(value, (counts.get(value) ?? 0) + row.count);
    }
    return Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) => {
      if (a.value === "") return 1;
      if (b.value === "") return -1;
      return b.count - a.count || a.value.localeCompare(b.value);
    });
  }, [aggregations]);

  return (
    <>
      {aggregations === undefined && (
        <div className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}>Loading filters…</div>
      )}
      {aggregations !== undefined && groupRows.length > 0 && (
        <>
          <LibraryAggregationSectionHeading>Type</LibraryAggregationSectionHeading>
          <LibraryAggregationTypeColumn>
            {groupRows.slice(0, 16).map((row) => {
              const value = row.value;
              const label = value ? value : "Unassigned";
              const selected = libraryFilter.group !== null && libraryFilter.group === value;
              return (
                <LibraryAggregationTypeRowButton
                  key={`g-${value || "empty"}`}
                  label={label}
                  count={row.count}
                  selected={selected}
                  onToggle={() =>
                    setLibraryFilter((f) => ({
                      ...f,
                      group: f.group === value ? null : value,
                    }))
                  }
                />
              );
            })}
          </LibraryAggregationTypeColumn>
        </>
      )}
      {aggregations !== undefined && aggregations.byGenre.length > 0 && (
        <>
          <LibraryAggregationSectionHeading>Genre</LibraryAggregationSectionHeading>
          <LibraryAggregationChipWrap>
            {aggregations.byGenre.slice(0, 16).map((row) => {
              const selected = libraryFilter.genre === row.value;
              return (
                <LibraryAggregationFacetChip
                  key={`genre-${row.value}`}
                  label={row.value}
                  selected={selected}
                  onToggle={() =>
                    setLibraryFilter((f) => ({
                      ...f,
                      genre: f.genre === row.value ? null : row.value,
                    }))
                  }
                />
              );
            })}
          </LibraryAggregationChipWrap>
        </>
      )}
      {aggregations !== undefined && aggregations.byStyle.length > 0 && (
        <>
          <LibraryAggregationSectionHeading>Style / medium</LibraryAggregationSectionHeading>
          <LibraryAggregationChipWrap>
            {aggregations.byStyle.slice(0, 14).map((row) => {
              const selected = libraryFilter.style === row.value;
              return (
                <LibraryAggregationFacetChip
                  key={`style-${row.value}`}
                  label={row.value}
                  selected={selected}
                  onToggle={() =>
                    setLibraryFilter((f) => ({
                      ...f,
                      style: f.style === row.value ? null : row.value,
                    }))
                  }
                />
              );
            })}
          </LibraryAggregationChipWrap>
        </>
      )}
      <SidebarFilterControls libraryFilter={libraryFilter} setLibraryFilter={setLibraryFilter} />
    </>
  );
}

function Sidebar({
  activeView,
  onView,
  libraryFilter,
  setLibraryFilter,
}: {
  activeView: string;
  onView: (v: string) => void;
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
}) {
  return (
    <aside style={{
      width: 208, flexShrink: 0, background: "var(--pd-bg-1)",
      borderRight: "1px solid var(--pd-line)", display: "flex", flexDirection: "column",
      height: "100%", position: "relative", overflow: "hidden",
    }}>
      <div style={{ height: 44, padding: "0 14px", borderBottom: "1px solid var(--pd-line)", display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box" }}>
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
          <div style={{ padding: "4px 4px 4px" }}>
            <LibraryAggregationsErrorBoundary
              fallback={
                <>
                  <div className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)", marginBottom: 10, lineHeight: 1.45 }}>
                    Type / genre / style counts need the latest Convex deploy. You can still filter with the options below.
                  </div>
                  <SidebarFilterControls libraryFilter={libraryFilter} setLibraryFilter={setLibraryFilter} />
                </>
              }
            >
              <SidebarLibraryAggregationBody libraryFilter={libraryFilter} setLibraryFilter={setLibraryFilter} />
            </LibraryAggregationsErrorBoundary>
          </div>
        </Authenticated>
      </div>

      <div style={{ borderTop: "1px solid var(--pd-line)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 10.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-green)", boxShadow: "0 0 8px var(--pd-green)" }} />
        <span className="pd-mono" style={{ color: "var(--pd-ink-mute)" }}>convex · live</span>
      </div>
    </aside>
  );
}

function Topbar({ search, setSearch, view, setView, tweaksOn, onToggleTweaks, accountActions }: {
  search: string; setSearch: (s: string) => void; view: string; setView: (v: string) => void;
  tweaksOn: boolean; onToggleTweaks: () => void;
  accountActions: React.ReactNode;
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
        borderColor: tweaksOn ? "color-mix(in srgb, var(--pd-accent) 42%, transparent)" : "var(--pd-line)",
        background: tweaksOn ? "var(--pd-accent-soft)" : "transparent",
        color: tweaksOn ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
        boxShadow: tweaksOn ? "0 0 0 1px color-mix(in srgb, var(--pd-accent) 18%, transparent) inset" : "none",
      }}>
        <PinIcon name="bolt" size={13} />
      </button>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginLeft: 6,
        paddingLeft: 10,
        borderLeft: "1px solid var(--pd-line)",
        flexShrink: 0,
      }}>
        {accountActions}
      </div>
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
