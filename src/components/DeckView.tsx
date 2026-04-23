import { lazy, Suspense, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const DeckComposer = lazy(() =>
  import("./deck/DeckComposer").then((mod) => ({ default: mod.DeckComposer }))
);

export function DeckView({
  selectedDeckId,
  onSelectDeck,
}: {
  selectedDeckId: Id<"decks"> | null;
  onSelectDeck: (deckId: Id<"decks"> | null) => void;
}) {
  const decks = useQuery(api.decks.list);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    if (!selectedDeckId && decks && decks.length > 0) {
      onSelectDeck(decks[0]._id);
    }
  }, [selectedDeckId, decks, onSelectDeck]);

  const activeDeckId =
    selectedDeckId ?? (decks && decks.length > 0 ? decks[0]._id : null);
  const deck = useQuery(api.decks.getById, activeDeckId ? { deckId: activeDeckId } : "skip");

  if (decks === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="w-full">
        <Card className="border-white/10 bg-[#050505] text-white shadow-[0_30px_120px_rgba(0,0,0,0.34)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Deck</CardTitle>
                <CardDescription className="text-white/55">No decks yet.</CardDescription>
              </div>
              {loggedInUser?.isAnonymous ? (
                <Badge className="border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-300 hover:bg-amber-400/10">
                  Guest session
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/55">
            {loggedInUser?.isAnonymous ? (
              <p>
                You are signed in as a guest. Saved production decks belong to your email account, so this temporary session will look empty.
              </p>
            ) : null}
            <p>Go to Boards and click "Convert to Deck" after selecting images.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col gap-3 text-white">
      <div className="border border-white/8 bg-[#080808] px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Deck library</p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-white">
              {deck?.title ?? "Decks"}
            </h2>
            <p className="mt-1 text-xs text-white/42">
              {deck?.boardName
                ? `Working from ${deck.boardName}.`
                : "Choose a deck and keep editing without leaving the app."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/52 hover:bg-white/[0.03]">
              {decks.length} deck{decks.length === 1 ? "" : "s"}
            </Badge>
            {loggedInUser?.isAnonymous ? (
              <Badge className="border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-300 hover:bg-amber-400/10">
                Guest session
              </Badge>
            ) : null}
          </div>
        </div>

        {decks.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {decks.map((item) => {
              const active = item._id === activeDeckId;
              return (
                <Button
                  key={item._id}
                  variant="ghost"
                  className={active
                    ? "h-auto border border-[var(--pd-accent)] bg-[var(--pd-accent-soft)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pd-accent-ink)] hover:bg-[var(--pd-accent-soft)]"
                    : "h-auto border border-white/10 bg-[#0c0c0c] text-[10px] font-semibold uppercase tracking-[0.2em] text-white/58 hover:border-white/16 hover:bg-[#101010] hover:text-white"}
                  onClick={() => onSelectDeck(item._id)}
                >
                  {item.title}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      {deck === undefined ? (
        <Card className="border-white/10 bg-[#050505] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardContent className="flex min-h-[18rem] items-center justify-center">
            <Spinner className="size-5" />
          </CardContent>
        </Card>
      ) : deck ? (
        <Suspense
          fallback={
            <Card className="border-white/10 bg-[#050505] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <CardContent className="flex min-h-[18rem] items-center justify-center">
                <Spinner className="size-5" />
              </CardContent>
            </Card>
          }
        >
          <DeckComposer deck={deck} />
        </Suspense>
      ) : (
        <Card className="border-white/10 bg-[#050505] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardContent className="min-h-[18rem] py-10 text-center text-sm text-white/55">
            Deck not found or inaccessible.
          </CardContent>
        </Card>
      )}
      </div>
  );
}
