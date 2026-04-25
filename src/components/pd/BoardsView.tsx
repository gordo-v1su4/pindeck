import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinChip } from "@/components/ui/pindeck";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

interface BoardsViewProps {
  onOpenDeck: (deckId: Id<"decks">) => void;
}

export function BoardsView({ onOpenDeck }: BoardsViewProps) {
  const boards = useQuery(api.boards.list);
  const boardPreviewUrls = useQuery(
    api.boards.getBoardPreviewUrls,
    boards && boards.length > 0 ? { boardIds: boards.map((b) => b._id), limit: 4 } : "skip"
  );
  const createDeck = useMutation(api.decks.createFromBoard);

  const handleConvertToDeck = async (boardId: Id<"collections">) => {
    try {
      const deckId = await createDeck({ boardId });
      toast.success("Deck created from board!");
      onOpenDeck(deckId);
    } catch (error) {
      console.error("Failed to convert board to deck:", error);
      toast.error("Failed to convert board");
    }
  };

  if (boards === undefined) {
    return <div className="pd-fade-in" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>Loading…</div>;
  }

  return (
    <div className="pd-scroll pd-fade-in" style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Boards</div>
        <div className="pd-mono" style={{ fontSize: 11, color: "var(--pd-ink-faint)" }}>{boards.length} collections</div>
      </div>

      {boards.length === 0 && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "60px 20px", color: "var(--pd-ink-faint)", textAlign: "center", gap: 12,
        }}>
          <div style={{ fontSize: 32 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink-mute)" }}>No boards yet</div>
          <div style={{ fontSize: 12, maxWidth: 300, lineHeight: 1.5 }}>
            Create a board from the gallery to organize your references into collections.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {boards.map((b) => {
          const previews = boardPreviewUrls?.[b._id] || [];
          return (
            <div key={b._id} style={{
              background: "var(--pd-panel)", border: "1px solid var(--pd-line)",
              borderRadius: 4, overflow: "hidden", cursor: "pointer",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", gap: 1, aspectRatio: "16/10", background: "#000" }}>
                <div style={{ gridRow: "span 2", overflow: "hidden" }}>
                  {previews[0] && <img src={previews[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                {previews.slice(1, 3).map((url, i) => (
                  <div key={i} style={{ overflow: "hidden" }}>
                    {url && <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                ))}
              </div>
              <div style={{ padding: "9px 10px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 600, color: "var(--pd-ink)", flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{b.name}</div>
                  <PinChip mono variant="outline">{b.isPublic ? "public" : "private"}</PinChip>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 10.5, color: "var(--pd-ink-faint)" }} className="pd-mono">
                  <span>{b.imageIds?.length || 0} pins</span>
                </div>
                <button
                  onClick={() => handleConvertToDeck(b._id)}
                  style={{
                    marginTop: 8, fontSize: 11, color: "var(--pd-accent)",
                    background: "transparent", border: "none", cursor: "pointer",
                  }}
                >
                  Convert to Deck →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
