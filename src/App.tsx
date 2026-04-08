import { Authenticated, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ImageGrid } from "./components/ImageGrid";
import { SearchBar } from "./components/SearchBar";
import { CategoryFilter } from "./components/CategoryFilter";
import { useState, useEffect, lazy, Suspense } from "react";
import {
  BookOpenIcon,
  ImagesIcon,
  LayoutPanelTopIcon,
  MenuIcon,
  PresentationIcon,
  TablePropertiesIcon,
  UploadIcon,
} from "lucide-react";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ImageUploadForm = lazy(() =>
  import("./components/ImageUploadForm").then((mod) => ({ default: mod.ImageUploadForm }))
);
const BoardsView = lazy(() =>
  import("./components/BoardsView").then((mod) => ({ default: mod.BoardsView }))
);
const TableView = lazy(() =>
  import("./components/TableView").then((mod) => ({ default: mod.TableView }))
);
const DeckView = lazy(() =>
  import("./components/DeckView").then((mod) => ({ default: mod.DeckView }))
);

const APP_TABS = [
  { value: "gallery", label: "Gallery", icon: ImagesIcon },
  { value: "upload", label: "Upload", icon: UploadIcon },
  { value: "boards", label: "Boards", icon: LayoutPanelTopIcon },
  { value: "deck", label: "Deck", icon: PresentationIcon },
  { value: "table", label: "Table", icon: TablePropertiesIcon },
] as const;

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [activeTab, setActiveTabState] = useState("gallery");
  const [selectedDeckId, setSelectedDeckId] = useState<Id<"decks"> | null>(null);
  const { isAuthenticated, isLoading } = useConvexAuth();

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const showAppChrome = Boolean(isAuthenticated || loggedInUser);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (tab === "deck" && selectedDeckId) {
      window.location.hash = `deck:${selectedDeckId}`;
      return;
    }
    window.location.hash = tab;
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

      if (APP_TABS.some((tab) => tab.value === rawHash)) {
        setActiveTabState(rawHash);
      }
    };

    parseHash();
    const handleHashChange = () => parseHash();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [boardVersion, setBoardVersion] = useState(0);
  const incrementBoardVersion = () => setBoardVersion((value) => value + 1);

  return (
    <div className="min-h-screen bg-background">
      {showAppChrome && (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="site-brand-lockup">
                  <div className="site-brand-mark">P/</div>
                  <div className="site-brand-word">
                    <span className="site-brand-word-light">PIN</span>
                    <span className="site-brand-word-accent">DECK</span>
                  </div>
                      </div>
                      <a
                        href="https://docs.pindeck.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <BookOpenIcon className="h-4 w-4" />
                        Docs
                      </a>
                      <Authenticated>
                  <div className="hidden md:block">
                    <SearchBar onSearch={setSearchTerm} />
                  </div>
                </Authenticated>
              </div>

              <div className="flex items-center gap-2">
                <Authenticated>
                  <div className="hidden md:block">
                    <SignOutButton />
                  </div>
                </Authenticated>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="md:hidden">
                      <MenuIcon />
                      <span className="sr-only">Open navigation</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Navigation</SheetTitle>
                      <SheetDescription>Switch sections or continue working in your deck flow.</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-3 px-4 pb-6">
                      <Authenticated>
                        <SearchBar onSearch={setSearchTerm} />
                      </Authenticated>
                      <div className="flex flex-col gap-2">
                        {APP_TABS.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <Button
                              key={tab.value}
                              variant={activeTab === tab.value ? "default" : "ghost"}
                              className="justify-start"
                              onClick={() => setActiveTab(tab.value)}
                            >
                              <Icon data-icon="inline-start" />
                              {tab.label}
                            </Button>
                          );
                        })}
                      </div>
                      <Authenticated>
                        <SignOutButton />
                      </Authenticated>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="hidden md:block">
              <Tabs
                value={activeTab}
                onValueChange={(value) => value && setActiveTab(value)}
                className="w-full"
              >
                <TabsList
                  variant="line"
                  className="h-auto flex-wrap justify-start rounded-none border-b border-border bg-transparent p-0"
                >
                  {APP_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger key={tab.value} value={tab.value} className="flex-none">
                        <Icon data-icon="inline-start" />
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                <a
                  href="https://docs.pindeck.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <BookOpenIcon className="h-4 w-4" />
                  Docs
                </a>
              </Tabs>
            </div>

            {activeTab === "gallery" && (
              <CategoryFilter
                selectedGroup={undefined}
                onGroupChange={() => {}}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            )}
          </div>
        </header>
      )}

      <main
        className={
          showAppChrome
            ? "mx-auto w-full max-w-[1680px] px-4 py-8 pb-16 sm:px-6 lg:px-8"
            : "mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6"
        }
      >
        {showAppChrome ? (
          <>
            {activeTab === "gallery" && (
              <Content
                searchTerm={searchTerm}
                selectedGroup={selectedGroup}
                selectedCategory={selectedCategory}
                setActiveTab={setActiveTab}
                incrementBoardVersion={incrementBoardVersion}
              />
            )}
            {activeTab === "upload" && (
              <Suspense
                fallback={
                  <div className="flex min-h-[30vh] items-center justify-center">
                    <Spinner className="size-5" />
                  </div>
                }
              >
                <ImageUploadForm />
              </Suspense>
            )}
            {activeTab === "boards" && (
              <Suspense
                fallback={
                  <div className="flex min-h-[30vh] items-center justify-center">
                    <Spinner className="size-5" />
                  </div>
                }
              >
                <BoardsView
                  key={boardVersion}
                  setActiveTab={setActiveTab}
                  incrementBoardVersion={incrementBoardVersion}
                  onDeckCreated={openDeckTab}
                />
              </Suspense>
            )}
            {activeTab === "deck" && (
              <Suspense
                fallback={
                  <div className="flex min-h-[30vh] items-center justify-center">
                    <Spinner className="size-5" />
                  </div>
                }
              >
                <DeckView selectedDeckId={selectedDeckId} onSelectDeck={selectDeck} />
              </Suspense>
            )}
            {activeTab === "table" && (
              <Suspense
                fallback={
                  <div className="flex min-h-[30vh] items-center justify-center">
                    <Spinner className="size-5" />
                  </div>
                }
              >
                <TableView />
              </Suspense>
            )}
          </>
        ) : (
          <Content
            searchTerm={searchTerm}
            selectedGroup={selectedGroup}
            selectedCategory={selectedCategory}
            setActiveTab={setActiveTab}
            incrementBoardVersion={incrementBoardVersion}
          />
        )}
      </main>

      <Toaster theme="dark" />
    </div>
  );
}

function Content({
  searchTerm,
  selectedGroup,
  selectedCategory,
  setActiveTab,
  incrementBoardVersion,
}: {
  searchTerm: string;
  selectedGroup: string | undefined;
  selectedCategory: string | undefined;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

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
          selectedGroup={selectedGroup}
          selectedCategory={selectedCategory}
          setActiveTab={setActiveTab}
          incrementBoardVersion={incrementBoardVersion}
        />
      </Authenticated>
    </div>
  );
}
