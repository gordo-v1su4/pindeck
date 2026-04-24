import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { ImageGrid } from "./components/ImageGrid";
import { useState, useEffect, lazy, Suspense } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { Spinner } from "@/components/ui/spinner";
import { PdShell, type PdView } from "@/components/pd/PdShell";

const ImageUploadForm = lazy(() =>
  import("./components/ImageUploadForm").then((mod) => ({
    default: mod.ImageUploadForm,
  })),
);
const BoardsView = lazy(() =>
  import("./components/BoardsView").then((mod) => ({
    default: mod.BoardsView,
  })),
);
const TableView = lazy(() =>
  import("./components/TableView").then((mod) => ({ default: mod.TableView })),
);
const DeckView = lazy(() =>
  import("./components/DeckView").then((mod) => ({ default: mod.DeckView })),
);

const APP_TABS: ReadonlyArray<PdView> = [
  "gallery",
  "upload",
  "boards",
  "deck",
  "table",
];

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    string | undefined
  >();
  const [activeTab, setActiveTabState] = useState<PdView>("gallery");
  const [selectedDeckId, setSelectedDeckId] = useState<Id<"decks"> | null>(
    null,
  );
  const { isAuthenticated } = useConvexAuth();

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const showAppChrome = Boolean(isAuthenticated || loggedInUser);

  const setActiveTab = (tab: string) => {
    const t = tab as PdView;
    setActiveTabState(t);
    if (t === "deck" && selectedDeckId) {
      window.location.hash = `deck:${selectedDeckId}`;
      return;
    }
    window.location.hash = t;
  };

  const openDeckTab = (deckId: Id<"decks">) => {
    setSelectedDeckId(deckId);
    setActiveTabState("deck");
    window.location.hash = `deck:${deckId}`;
  };

  const selectDeck = (deckId: Id<"decks"> | null) => {
    setSelectedDeckId(deckId);
    if (deckId) {
      setActiveTabState("deck");
      window.location.hash = `deck:${deckId}`;
    }
  };

  useEffect(() => {
    const parseHash = () => {
      if (!window.location.hash) return;
      const rawHash = window.location.hash.substring(1);
      if (!rawHash) return;

      if (rawHash.startsWith("deck:")) {
        const deckId = rawHash.slice("deck:".length);
        if (deckId) {
          setSelectedDeckId(deckId as Id<"decks">);
        }
        setActiveTabState("deck");
        return;
      }

      if (APP_TABS.includes(rawHash as PdView)) {
        setActiveTabState(rawHash as PdView);
      }
    };

    parseHash();
    const handleHashChange = () => parseHash();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [boardVersion, setBoardVersion] = useState(0);
  const incrementBoardVersion = () => setBoardVersion((value) => value + 1);

  if (!showAppChrome) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--pd-bg)" }}>
        <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6">
          <Content
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            setActiveTab={setActiveTab}
            incrementBoardVersion={incrementBoardVersion}
          />
        </main>
        <Toaster theme="dark" />
      </div>
    );
  }

  return (
    <PdShell
      activeView={activeTab}
      onView={(v) => setActiveTab(v)}
      search={searchTerm}
      setSearch={setSearchTerm}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {activeTab === "gallery" && (
          <div
            className="pd-scroll pd-fade-in"
            style={{ flex: 1, overflow: "auto", padding: 16 }}
          >
            <Content
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              setActiveTab={setActiveTab}
              incrementBoardVersion={incrementBoardVersion}
            />
          </div>
        )}
        {activeTab === "upload" && (
          <div
            className="pd-scroll pd-fade-in"
            style={{ flex: 1, overflow: "auto", padding: 16 }}
          >
            <Suspense fallback={<ViewSpinner />}>
              <ImageUploadForm />
            </Suspense>
          </div>
        )}
        {activeTab === "boards" && (
          <div
            className="pd-scroll pd-fade-in"
            style={{ flex: 1, overflow: "auto", padding: 16 }}
          >
            <Suspense fallback={<ViewSpinner />}>
              <BoardsView
                key={boardVersion}
                setActiveTab={setActiveTab}
                incrementBoardVersion={incrementBoardVersion}
                onDeckCreated={openDeckTab}
              />
            </Suspense>
          </div>
        )}
        {activeTab === "table" && (
          <div
            className="pd-scroll pd-fade-in"
            style={{ flex: 1, overflow: "auto" }}
          >
            <Suspense fallback={<ViewSpinner />}>
              <TableView />
            </Suspense>
          </div>
        )}
        {activeTab === "deck" && (
          <div
            className="pd-scroll pd-fade-in"
            style={{ flex: 1, overflow: "auto" }}
          >
            <Suspense fallback={<ViewSpinner />}>
              <DeckView
                selectedDeckId={selectedDeckId}
                onSelectDeck={selectDeck}
              />
            </Suspense>
          </div>
        )}
      </div>

      <Toaster theme="dark" />
    </PdShell>
  );
}

function ViewSpinner() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}

function Content({
  searchTerm,
  selectedCategory,
  setActiveTab,
  incrementBoardVersion,
}: {
  searchTerm: string;
  selectedCategory: string | undefined;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}) {
  const { isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Unauthenticated>
        <div className="flex w-full items-center justify-center">
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        <ImageGrid
          searchTerm={searchTerm}
          selectedGroup={undefined}
          selectedCategory={selectedCategory}
          setActiveTab={setActiveTab}
          incrementBoardVersion={incrementBoardVersion}
        />
      </Authenticated>
    </div>
  );
}
