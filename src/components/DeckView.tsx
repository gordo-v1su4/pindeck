import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/components/deck/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

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
        "group flex h-fit w-[min(34vw,360px)] min-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded border border-white/[0.08] bg-[#07070a]",
        "text-left",
      )}
    >
      <div className="flex min-h-[2.25rem] items-center border-b border-white/[0.06] px-2.5 py-2">
        <span className="text-[7.5px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          + BLANK
        </span>
      </div>
      <div
        className="flex min-h-[1.75rem] shrink-0 items-baseline justify-between border-b border-white/[0.05] px-2.5 py-1.5 text-[7.5px] uppercase tracking-[0.2em] text-zinc-500/90"
        aria-hidden
      >
        <span>New deck</span>
        <span className="font-mono text-zinc-600">—</span>
      </div>
      <div className="p-2">
        <button
          type="button"
          onClick={onStartFromGallery}
          className="group flex aspect-[16/10] w-full flex-col items-center justify-center gap-0 rounded border border-dashed border-white/18 bg-[#0a0a0d] px-3 text-center transition-colors hover:border-white/30 hover:bg-[#0c0c10]"
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
      <div className="shrink-0 border-t border-white/[0.06] px-2.5 py-2 text-[7.5px] uppercase leading-relaxed tracking-[0.18em] text-zinc-500/80">
        <span className="text-zinc-500/70">BLANK</span>
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

function slideGridStyle(count: number) {
  const visible = Math.max(1, Math.min(count, 6));
  const columns = visible <= 1 ? 1 : visible <= 4 ? 2 : 3;
  const rows = Math.ceil(visible / columns);
  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };
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
  const deleteDeck = useMutation(api.decks.deleteDeck);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [deleteTarget, setDeleteTarget] = useState<NonNullable<typeof decks>[number] | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
      const visibleDecks = decks.filter((deck, index, allDecks) => {
        const signature = `${deck.boardId ?? "blank"}:${deck.title ?? ""}:${deck.slides.map((slide) => slide.imageId).join("|")}`;
        return allDecks.findIndex((candidate) => {
          const candidateSignature = `${candidate.boardId ?? "blank"}:${candidate.title ?? ""}:${candidate.slides.map((slide) => slide.imageId).join("|")}`;
          return candidateSignature === signature;
        }) === index;
      });
      const handleDeleteDeck = async () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        try {
          await deleteDeck({ deckId: deleteTarget._id });
          toast.success("Deck deleted.");
          setDeleteTarget(null);
        } catch (error) {
          console.error("Failed to delete deck", error);
          toast.error("Could not delete deck.");
        } finally {
          setDeleteBusy(false);
        }
      };
      return (
        <div className="pd-scroll pd-fade-in relative flex min-h-0 w-full flex-1 flex-col overflow-auto" style={{ padding: 16, background: "var(--pd-bg)", color: "var(--pd-ink)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Decks</div>
              <div className="pd-mono" style={{ fontSize: 11, color: "var(--pd-ink-faint)" }}>{visibleDecks.length} saved</div>
          </div>
        {visibleDecks.length === 0 ? (
          <p className="shrink-0 pt-2 text-[11px] leading-relaxed text-zinc-500">
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

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto py-1 [scrollbar-width:thin]">
          <div className="flex min-h-[320px] snap-x snap-mandatory gap-3 pb-1">
            {visibleDecks.map((item) => {
              const count = item.slides.length;
              const strip = item.stripImageUrls ?? [];
              const previewCount = Math.min(strip.length, 6);
              const slideTitles =
                "previewSlideTitles" in item &&
                Array.isArray(item.previewSlideTitles)
                  ? item.previewSlideTitles
                  : [];
              const restLine =
                slideTitles.length > 1
                  ? slideTitles.slice(1, 4).join(" · ").trim()
                  : item.subtitle?.trim() ?? "";
              const boardLabel =
                item.boardName?.trim() || "Board";
              return (
                <article
                  key={item._id}
                  className={cn(
                    "group flex h-fit w-[min(34vw,360px)] min-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded border border-white/[0.08] bg-[#07070a] text-left transition-all",
                    "hover:border-white/[0.14] hover:bg-[#09090c]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pd-accent)]/55",
                  )}
                >
                  <div className="flex min-h-[2.25rem] items-center justify-between gap-2 border-b border-white/[0.06] px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => onSelectDeck(item._id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-100/92">
                      {item.title || "Untitled deck"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-transparent text-white/34 transition-colors hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300/60"
                      aria-label={`Delete ${item.title || "Untitled deck"}`}
                      title="Delete deck"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectDeck(item._id)}
                    className="block w-full text-left"
                  >
                  <div className="flex items-baseline justify-between border-b border-white/[0.05] px-2.5 py-1.5 text-[7.5px] uppercase tracking-[0.2em] text-zinc-500/90">
                    <span>
                      {count} slide{count === 1 ? "" : "s"}
                      {strip.length > 0 && count > previewCount
                        ? ` · ${previewCount} shown`
                        : ""}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {formatDeckAge(item.createdAt)}
                    </span>
                  </div>

                  <div className="relative w-full overflow-hidden bg-zinc-950/80 p-2">
                    {strip.length > 0 ? (
                      <div
                        className="grid gap-1"
                        style={slideGridStyle(previewCount)}
                      >
                        {strip.slice(0, 6).map((src, i) => (
                          <div
                            key={`${item._id}-s-${i}`}
                            className="relative aspect-video overflow-hidden rounded-[2px] border border-white/[0.07] bg-black"
                          >
                            <img
                              src={src}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                            />
                            <div
                              className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/82 to-transparent"
                              aria-hidden
                            />
                            <span className="absolute bottom-1 left-1 font-mono text-[7px] uppercase tracking-[0.12em] text-white/64">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] flex-col items-center justify-center bg-gradient-to-b from-zinc-800/30 to-zinc-950 px-2 text-center">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-600">
                          No stills
                        </p>
                      </div>
                    )}
                    <span className="pointer-events-none absolute right-2 top-2 z-[1] h-2.5 w-2.5 border-r border-t border-white/25" />
                    <span className="pointer-events-none absolute bottom-2 left-2 z-[1] h-2.5 w-2.5 border-b border-l border-white/25" />
                    <span className="pointer-events-none absolute bottom-2 right-2 z-[1] h-2.5 w-2.5 border-b border-r border-white/25" />
                    <span className="pointer-events-none absolute left-2 top-2 z-[1] h-2.5 w-2.5 border-l border-t border-white/25" />
                  </div>

                  <div className="space-y-1 border-t border-white/[0.06] px-2.5 py-2">
                    <p className="text-[8.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-white/86 line-clamp-1">
                      {slideTitles[0] ?? item.title ?? "Untitled deck"}
                    </p>
                    {restLine.length > 0 ? (
                      <p className="text-[7.5px] leading-snug tracking-[0.02em] text-zinc-500 line-clamp-1 normal-case">
                        {restLine}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 border-t border-white/[0.06] px-2.5 py-2 text-[7.5px] uppercase leading-relaxed tracking-[0.18em] text-zinc-500/80">
                    <span className="text-zinc-500/70">{boardLabel}</span>
                  </div>
                  </button>
                </article>
              );
            })}
            <DeckAddNewColumn onStartFromGallery={start} />
          </div>
        </div>
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="w-[min(92vw,25rem)] max-w-[25rem] !gap-0 !p-0 text-white">
            <div className="border-b border-white/10 px-5 py-4">
              <DialogTitle className="text-[15px] font-semibold text-white">
                Delete deck?
              </DialogTitle>
              <DialogDescription className="mt-2 text-[12px] leading-5 text-white/58">
                This removes the saved deck from your library. The source board and images stay in Pindeck.
              </DialogDescription>
            </div>
            <div className="px-5 py-4 text-[12px] text-white/70">
              {deleteTarget?.title || "Untitled deck"}
            </div>
            <DialogFooter className="border-t border-white/10 bg-white/[0.02]">
              <DialogClose asChild>
                <Button variant="outline" disabled={deleteBusy}>Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => void handleDeleteDeck()}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Deleting..." : "Delete Deck"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <Card className="flex min-h-[18rem] flex-1 items-center justify-center border-white/10 bg-[#050507] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <CardContent className="flex flex-col items-center justify-center">
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
    </div>
  );
}
