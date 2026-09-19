import React, {
  Component,
  useState,
  useEffect,
  useLayoutEffect,
  lazy,
  Suspense,
  useRef,
} from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "@/SignInForm";
import { SignOutButton } from "@/SignOutButton";
import { Toaster } from "sonner";
import { PinIcon } from "@/components/ui/pindeck";
import {
  TweaksPanel,
  DEFAULT_TWEAKS,
  type Tweaks,
} from "@/components/pd/TweaksPanel";
import { GalleryView } from "@/components/pd/GalleryView";
import { TableView } from "@/components/pd/TableView";
import { BoardsView } from "@/components/pd/BoardsView";
import { ImageDetailDrawer } from "@/components/pd/ImageDetailDrawer";
import { applyPindeckTweaksToDocument } from "@/lib/pdTheme";
import {
  Sidebar,
  Topbar,
  useAppView,
  useLibraryFilterState,
  useTableColumnVisibility,
} from "@/components/shell";

const ImageUploadForm = lazy(() =>
  import("@/components/ImageUploadForm").then((mod) => ({
    default: mod.ImageUploadForm,
  })),
);
/** Decks UI from `claude/redesign` — library strip + composer (see `src/components/DeckView.tsx`). */
const DeckView = lazy(() =>
  import("@/components/DeckView").then((mod) => ({ default: mod.DeckView })),
);

const DOCS_URL = "https://docs.pindeck.dev";

const SIDEBAR_COLLAPSE_STORAGE_KEY = "pindeck_sidebar_collapsed";

function shouldStartWithCollapsedSidebar() {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return window.matchMedia("(max-width: 900px)").matches;
  } catch {
    return false;
  }
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth <= 900;
}

/** Authenticated shell: auth, Convex library list, tweaks, and view bodies. View / filter / column state lives in `src/components/shell/` hooks. */
export default function App() {
  const [tweaks, setTweaks] = useState<Tweaks>(() => {
    try {
      const saved = localStorage.getItem("pindeck_tweaks");
      return saved
        ? { ...DEFAULT_TWEAKS, ...JSON.parse(saved) }
        : DEFAULT_TWEAKS;
    } catch {
      return DEFAULT_TWEAKS;
    }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    shouldStartWithCollapsedSidebar,
  );
  const {
    view,
    setView,
    selectView,
    galleryDisplayMode,
    setGalleryDisplayMode,
    activeDeckId,
    setActiveDeckId,
    openDeck,
  } = useAppView();
  const { libraryFilter, setLibraryFilter } = useLibraryFilterState();
  const { tableVisibleColumns, setTableVisibleColumns } =
    useTableColumnVisibility();
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const expandButtonRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const libraryImages = useQuery(
    api.images.list,
    isAuthenticated ? { limit: 1000 } : "skip",
  );

  useEffect(() => {
    localStorage.setItem("pindeck_tweaks", JSON.stringify(tweaks));
  }, [tweaks]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSE_STORAGE_KEY,
        String(sidebarCollapsed),
      );
    } catch {
      // Sidebar preference should never block app rendering.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const collapseWhenEnteringMobile = (event: MediaQueryListEvent) => {
      if (event.matches) setSidebarCollapsed(true);
    };
    mediaQuery.addEventListener("change", collapseWhenEnteringMobile);
    return () =>
      mediaQuery.removeEventListener("change", collapseWhenEnteringMobile);
  }, []);

  useEffect(() => {
    if (isMobileViewport()) setSidebarCollapsed(true);
  }, [view, activeDeckId]);

  useEffect(() => {
    if (sidebarCollapsed) expandButtonRef.current?.focus();
  }, [sidebarCollapsed]);

  /* useLayoutEffect: avoid one frame where .pd-* accent is wrong before paint */
  useLayoutEffect(() => {
    applyPindeckTweaksToDocument({
      accent: tweaks.accent,
      typography: tweaks.typography,
    });
  }, [tweaks.accent, tweaks.typography]);

  useEffect(() => {
    if (isAuthenticated) return;
    setSelectedImage(null);
    setTweaksOpen(false);
    setActivityOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedImage || libraryImages === undefined) return;
    const freshImage = libraryImages.find(
      (image: any) => image._id === selectedImage._id,
    );
    if (!freshImage) {
      setSelectedImage(null);
      return;
    }
    setSelectedImage(freshImage);
  }, [libraryImages, selectedImage?._id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        setSelectedImage(null);
        setTweaksOpen(false);
        setActivityOpen(false);
      }
      if (e.key === "g") setView("gallery");
      if (e.key === "t") setView("table");
      if (e.key === "b") setView("boards");
      if (e.key === "d") setView("deck");
      if (e.key === "u") setView("upload");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed((collapsed) => !collapsed);

  const closeTransientUi = () => {
    setSelectedImage(null);
    setTweaksOpen(false);
    setActivityOpen(false);
  };

  const appShellStyle: React.CSSProperties = {
    height: "100vh",
    display: "flex",
    background: "var(--pd-bg)",
    position: "relative",
    color: "var(--pd-ink)",
    fontFamily: "var(--pd-font-sans)",
    fontSize: 13,
    lineHeight: 1.45,
  };

  if (authLoading) {
    return (
      <div
        className={`pd-theme pd-app-shell ${tweaks.grain ? "pd-grain" : ""}`}
        style={appShellStyle}
      >
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
            <div
              className="pd-mono"
              style={{ marginTop: 12, letterSpacing: "0.06em" }}
            >
              Loading session...
            </div>
          </div>
        </div>
        <PindeckToaster />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className={`pd-theme pd-app-shell ${tweaks.grain ? "pd-grain" : ""}`}
        style={appShellStyle}
      >
        <div
          className="pd-auth-center"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <SignInForm />
        </div>
        <PindeckToaster />
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <div
        className={`pd-theme pd-app-shell ${tweaks.grain ? "pd-grain" : ""} ${
          sidebarCollapsed ? "pd-sidebar-collapsed" : "pd-sidebar-open"
        }`}
        style={appShellStyle}
      >
        <Sidebar
          activeView={view}
          onView={selectView}
          libraryFilter={libraryFilter}
          setLibraryFilter={setLibraryFilter}
          galleryDisplayMode={galleryDisplayMode}
          setGalleryDisplayMode={setGalleryDisplayMode}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
        />
        {sidebarCollapsed ? (
          <button
            ref={expandButtonRef}
            type="button"
            className="pd-sidebar-handle"
            aria-label="Expand sidebar"
            aria-expanded="false"
            aria-controls="pindeck-sidebar"
            onClick={toggleSidebar}
          >
            <span className="pd-sidebar-handle-mark" aria-hidden="true" />
            <span className="pd-sidebar-handle-label">Menu</span>
          </button>
        ) : (
          <button
            type="button"
            className="pd-sidebar-backdrop"
            aria-label="Collapse sidebar"
            aria-controls="pindeck-sidebar"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        <div
          className="pd-main-shell"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative",
          }}
        >
          <Topbar
            search={search}
            setSearch={setSearch}
            searchInputRef={searchInputRef}
            view={view}
            setView={selectView}
            docsUrl={`${DOCS_URL}?accent=${encodeURIComponent(tweaks.accent)}&typography=${encodeURIComponent(tweaks.typography)}`}
            tweaksOn={tweaksOpen}
            onToggleTweaks={() => {
              setActivityOpen(false);
              setTweaksOpen((open) => !open);
            }}
            activityOn={activityOpen}
            onToggleActivity={() => {
              setTweaksOpen(false);
              setActivityOpen((open) => !open);
            }}
            onCloseActivity={() => setActivityOpen(false)}
            libraryFilter={libraryFilter}
            setLibraryFilter={setLibraryFilter}
            visibleColumns={tableVisibleColumns}
            setVisibleColumns={setTableVisibleColumns}
            accountActions={
              <SignOutButton onBeforeSignOut={closeTransientUi} />
            }
          />

          <div
            className="pd-workspace"
            style={{
              flex: 1,
              display: "flex",
              minHeight: 0,
              position: "relative",
              alignItems: "stretch",
            }}
          >
            <div
              className="pd-view-stage"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              {view === "gallery" && (
                <GalleryView
                  search={search}
                  tweaks={tweaks}
                  onOpenImage={setSelectedImage}
                  libraryFilter={libraryFilter}
                  displayMode={galleryDisplayMode}
                  images={libraryImages}
                  onNavigateToBoards={() => selectView("boards")}
                />
              )}
              {view === "table" && (
                <TableView
                  search={search}
                  onOpenImage={setSelectedImage}
                  libraryFilter={libraryFilter}
                  images={libraryImages}
                  visibleColumns={tableVisibleColumns}
                />
              )}
              {view === "boards" && (
                <BoardsView
                  onOpenDeck={openDeck}
                  onOpenImage={setSelectedImage}
                />
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
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  <Suspense fallback={<Placeholder />}>
                    <ImageUploadForm />
                  </Suspense>
                </div>
              )}
            </div>

            {selectedImage && (
              <ImageDetailDrawer
                image={selectedImage}
                onClose={() => setSelectedImage(null)}
                tweaks={tweaks}
                onOpenImage={setSelectedImage}
              />
            )}
          </div>

          {tweaksOpen && (
            <TweaksPanel
              tweaks={tweaks}
              setTweaks={setTweaks}
              onClose={() => setTweaksOpen(false)}
            />
          )}

          <div
            className="pd-mono pd-status-bar"
            style={{
              position: "fixed",
              bottom: 0,
              left: 208,
              right: 0,
              height: 22,
              background: "var(--pd-bg-1)",
              borderTop: "1px solid var(--pd-line)",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              gap: 10,
              fontSize: 10,
              color: "var(--pd-ink-faint)",
              zIndex: 5,
            }}
          >
            <span>
              <span style={{ color: "var(--pd-green)" }}>●</span> convex · live
            </span>
            <span>·</span>
            <span>{view}</span>
            <div style={{ flex: 1 }} />
            <span>accent {tweaks.accent}</span>
            <span>·</span>
            <span>{tweaks.density}</span>
            <span>·</span>
            <span>{tweaks.cardStyle}</span>
          </div>
        </div>

        <PindeckToaster />
      </div>
    </AppErrorBoundary>
  );
}

function PindeckToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "rgba(11, 11, 14, 0.88)",
          border: "1px solid var(--pd-line-strong)",
          color: "var(--pd-ink)",
          borderRadius: "6px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.42)",
          backdropFilter: "blur(10px) saturate(1.12)",
          fontSize: "12px",
        },
      }}
    />
  );
}

/** Catch unexpected render errors in the authenticated shell. */
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[Pindeck] App render error", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="pd-theme"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--pd-bg)",
            color: "var(--pd-ink)",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <PinIcon name="film" size={28} stroke={1.2} />
            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>
              Something went wrong
            </div>
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--pd-ink-faint)",
                lineHeight: 1.5,
              }}
            >
              Pindeck hit an unexpected error. Reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid var(--pd-line)",
                background: "var(--pd-bg-2)",
                color: "var(--pd-ink)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Placeholder() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--pd-ink-faint)",
        fontSize: 12,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <PinIcon name="film" size={28} stroke={1.2} />
        <div style={{ marginTop: 10 }}>Loading…</div>
      </div>
    </div>
  );
}
