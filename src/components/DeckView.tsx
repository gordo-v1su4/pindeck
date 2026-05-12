import { lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/components/deck/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
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
        "group flex h-full min-h-0 w-[min(22vw,200px)] shrink-0 snap-start flex-col overflow-hidden rounded border border-white/[0.08] bg-[#07070a]",
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
      const visibleDecks = decks.filter((deck, index, allDecks) => {
        const signature = `${deck.boardId ?? "blank"}:${deck.title ?? ""}:${deck.slides.map((slide) => slide.imageId).join("|")}`;
        return allDecks.findIndex((candidate) => {
          const candidateSignature = `${candidate.boardId ?? "blank"}:${candidate.title ?? ""}:${candidate.slides.map((slide) => slide.imageId).join("|")}`;
          return candidateSignature === signature;
        }) === index;
      });
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

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:thin]">
          <div className="flex h-[min(78vh,820px)] min-h-[320px] snap-x snap-mandatory gap-3 pb-1">
            {visibleDecks.map((item) => {
              const count = item.slides.length;
              const strip = item.stripImageUrls ?? [];
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
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onSelectDeck(item._id)}
                  className={cn(
                    "group flex h-full w-[min(22vw,200px)] shrink-0 snap-start flex-col overflow-hidden rounded border border-white/[0.08] bg-[#07070a] text-left transition-all",
                    "hover:border-white/[0.14] hover:bg-[#09090c]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pd-accent)]/55",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-2.5 py-2">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-100/92">
                      {item.title || "Untitled deck"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-white/[0.05] px-2.5 py-1.5 text-[7.5px] uppercase tracking-[0.2em] text-zinc-500/90">
                    <span>
                      {count} slide{count === 1 ? "" : "s"}
                      {strip.length > 0 && count > strip.length
                        ? ` · ${strip.length} shown`
                        : ""}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {formatDeckAge(item.createdAt)}
                    </span>
                  </div>

                  <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950/80">
                    {strip.length > 0 ? (
                      <>
                        {/* 16:9 “slide” hero — matches deck canvas framing */}
                        <div className="relative w-full shrink-0 aspect-video overflow-hidden">
                          <img
                            src={strip[0]}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="eager"
                            decoding="async"
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/93 via-black/48 to-transparent"
                            aria-hidden
                          />
                          <div className="absolute inset-x-0 bottom-0 z-[2] space-y-1.5 px-2 pb-2 pt-12">
                            <p className="text-[8.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-white/92 line-clamp-2">
                              {slideTitles[0] ?? item.title ?? "Untitled deck"}
                            </p>
                            {restLine.length > 0 ? (
                              <p className="text-[7.5px] leading-snug tracking-[0.02em] text-zinc-400/92 line-clamp-2 normal-case">
                                {restLine}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {/* Remaining slides: filmstrip — each uses `images.colors` like table rows */}
                        {strip.length > 1 ? (
                          <div className="grid min-h-0 flex-1 auto-cols-fr grid-flow-col gap-px border-t border-white/[0.06]">
                            {strip.slice(1).map((src, j) => {
                              const i = j + 1;
                              return (
                                <div
                                  key={`${item._id}-s-${i}`}
                                  className="flex min-h-0 min-w-0 flex-1 flex-col bg-black/40"
                                >
                                  <div className="relative aspect-video w-full min-h-[44px] flex-1 overflow-hidden">
                                    <img
                                      src={src}
                                      alt=""
                                      className="absolute inset-0 h-full w-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gradient-to-b from-zinc-800/30 to-zinc-950 px-2 text-center">
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

                  <div className="shrink-0 border-t border-white/[0.06] px-2.5 py-2 text-[7.5px] uppercase leading-relaxed tracking-[0.18em] text-zinc-500/80">
                    <span className="text-zinc-500/70">{boardLabel}</span>
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
