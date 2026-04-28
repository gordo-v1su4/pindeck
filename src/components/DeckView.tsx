import { lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/deck/utils/cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const DeckComposer = lazy(() =>
  import("./deck/DeckComposer").then((mod) => ({ default: mod.DeckComposer })),
);

function DeckAddNewColumn({
  onStartFromGallery,
}: {
  onStartFromGallery: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-[min(22vw,200px)] shrink-0 snap-start flex-col overflow-hidden rounded border border-white/[0.08] bg-[#07070a]",
        "text-left",
      )}
    >
      <div className="flex items-center border-b border-white/[0.06] px-2.5 py-2">
        <span className="text-[7.5px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          + BLANK
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-1 p-2">
        <button
          type="button"
          onClick={onStartFromGallery}
          className="group flex h-full min-h-0 w-full flex-col items-center justify-center gap-0 rounded border border-dashed border-white/18 bg-[#0a0a0d] px-3 text-center transition-colors hover:border-white/30 hover:bg-[#0c0c10]"
        >
          <span
            className="text-3xl font-extralight leading-none text-white/90"
            aria-hidden
          >
            +
          </span>
          <span className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-zinc-100/90">
            NEW DECK
          </span>
          <span className="mt-1.5 font-mono text-[7.5px] tracking-[0.14em] text-zinc-500">
            from gallery
          </span>
        </button>
      </div>
      <div className="shrink-0 space-y-1.5 border-t border-white/[0.06] px-2.5 py-2.5">
        <p className="text-[7.5px] uppercase tracking-[0.2em] text-zinc-500">BLANK</p>
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-zinc-100/90">
          START NEW
        </p>
        <p className="text-[8.5px] leading-relaxed text-zinc-500">
          Compose from Pindeck library
        </p>
      </div>
    </div>
  );
}

function formatDeckAge(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

export function DeckView({
  selectedDeckId,
  onSelectDeck,
  onStartFromGallery,
}: {
  selectedDeckId: Id<"decks"> | null;
  onSelectDeck: (deckId: Id<"decks"> | null) => void;
  onStartFromGallery?: () => void;
}) {
  const decks = useQuery(api.decks.list);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const deck = useQuery(
    api.decks.getById,
    selectedDeckId ? { deckId: selectedDeckId } : "skip",
  );

  if (decks === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!selectedDeckId) {
    const start = onStartFromGallery ?? (() => {});
    return (
      <div className="relative flex w-full min-h-[60vh] flex-1 flex-col bg-[#050507] text-white">
        <div className="shrink-0 border-b border-white/[0.06] px-4 pb-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">
                Decks
              </h1>
              <p className="mt-3 text-[9px] font-medium uppercase leading-relaxed tracking-[0.32em] text-white/32">
                {decks.length} saved · scroll sideways · open a strip to edit
              </p>
            </div>
            {loggedInUser?.isAnonymous ? (
              <Badge className="border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-300 hover:bg-amber-400/10">
                Guest
              </Badge>
            ) : null}
          </div>
        </div>
        {decks.length === 0 ? (
          <p className="shrink-0 px-4 pt-2 text-[11px] leading-relaxed text-zinc-500">
            {loggedInUser?.isAnonymous ? (
              <>
                Guest sessions don&apos;t keep saved decks. Sign in to sync, or
                start from the gallery with <span className="text-zinc-400">+ BLANK</span> →
                New deck.
              </>
            ) : (
              <>
                No decks yet. Use <span className="text-zinc-400">+ BLANK</span> to pick stills
                in the gallery, or convert a board to a deck.
              </>
            )}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 py-5 [scrollbar-width:thin]">
          <div className="flex h-[min(78vh,820px)] snap-x snap-mandatory gap-3 pb-1">
            {decks.map((item) => {
              const count = item.slides.length;
              const strip = item.stripImageUrls ?? [];
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onSelectDeck(item._id)}
                  className={cn(
                    "group flex h-full w-[min(22vw,200px)] shrink-0 snap-start flex-col overflow-hidden rounded border border-white/[0.08] bg-[#07070a] text-left transition-all",
                    "hover:border-white/[0.14] hover:bg-[#09090c]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2457d6]/55",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-2.5 py-2">
                    <span className="text-[7.5px] font-medium uppercase tracking-[0.24em] text-emerald-400/75">
                      ● Saved
                    </span>
                    <span className="text-[7.5px] uppercase tracking-[0.2em] text-zinc-500">
                      {formatDeckAge(item.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-white/[0.05] px-2.5 py-1.5 text-[7.5px] uppercase tracking-[0.2em] text-zinc-500/90">
                    <span>
                      {count} slide{count === 1 ? "" : "s"}
                      {strip.length > 0 && count > strip.length
                        ? ` · ${strip.length} shown`
                        : ""}
                    </span>
                    <span className="text-zinc-600">film</span>
                  </div>

                  <div className="relative flex min-h-0 w-full flex-1 flex-col gap-px overflow-hidden bg-zinc-950/80">
                    {strip.length > 0 ? (
                      strip.map((src, i) => (
                        <div
                          key={`${item._id}-${i}`}
                          className="relative min-h-0 w-full flex-1 overflow-hidden"
                        >
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                            loading={i === 0 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-zinc-800/30 to-zinc-950" />
                    )}
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[42%] bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                      aria-hidden
                    />
                    <p className="absolute bottom-3 left-2.5 right-2.5 z-[2] text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-zinc-200/88 line-clamp-3">
                      {item.title || "Untitled deck"}
                    </p>
                    <span className="pointer-events-none absolute right-2 top-2 z-[1] h-2.5 w-2.5 border-r border-t border-white/25" />
                    <span className="pointer-events-none absolute bottom-2 left-2 z-[1] h-2.5 w-2.5 border-b border-l border-white/25" />
                    <span className="pointer-events-none absolute bottom-2 right-2 z-[1] h-2.5 w-2.5 border-b border-r border-white/25" />
                    <span className="pointer-events-none absolute left-2 top-2 z-[1] h-2.5 w-2.5 border-l border-t border-white/25" />
                  </div>

                  <div className="shrink-0 border-t border-white/[0.06] px-2.5 py-2.5 text-[7.5px] uppercase leading-relaxed tracking-[0.2em] text-zinc-500/75">
                    {item.boardName ?? "Your library"}
                  </div>
                </button>
              );
            })}
            <DeckAddNewColumn onStartFromGallery={start} />
          </div>
        </div>
      </div>
    );
  }

  if (deck === undefined) {
    return (
      <Card className="border-white/10 bg-[#050505] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardContent className="flex min-h-[18rem] items-center justify-center">
          <Spinner className="size-5" />
        </CardContent>
      </Card>
    );
  }

  if (!deck) {
    return (
      <Card className="border-white/10 bg-[#050505] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardContent className="min-h-[18rem] py-10 text-center text-sm text-white/55">
          Deck not found or inaccessible.
        </CardContent>
      </Card>
    );
  }

  return (
    <Suspense
      fallback={
        <Card className="border-white/10 bg-[#050505] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardContent className="flex min-h-[18rem] items-center justify-center">
            <Spinner className="size-5" />
          </CardContent>
        </Card>
      }
    >
      <DeckComposer
        deck={deck}
        onBackToLibrary={() => onSelectDeck(null)}
      />
    </Suspense>
  );
}
