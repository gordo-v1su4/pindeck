import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinChip, PinIcon, PinSwatches } from "@/components/ui/pindeck";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

interface BoardsViewProps {
  onOpenDeck: (deckId: Id<"decks">) => void;
  onOpenImage: (image: any) => void;
}

type BoardDetailTab = "images" | "decks";

export function BoardsView({ onOpenDeck, onOpenImage }: BoardsViewProps) {
  const boards = useQuery(api.boards.list);
  const boardPreviewUrls = useQuery(
    api.boards.getBoardPreviewUrls,
    boards && boards.length > 0 ? { boardIds: boards.map((b) => b._id), limit: 4 } : "skip"
  );
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"collections"> | null>(null);
  const [detailTab, setDetailTab] = useState<BoardDetailTab>("images");
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"collections"> | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const createDeck = useMutation(api.decks.createFromBoard);
  const deleteBoard = useMutation(api.boards.deleteBoard);

  const selectedBoard = boards?.find((board) => board._id === selectedBoardId) ?? null;
  const boardImages = useQuery(
    api.boards.getBoardImages,
    selectedBoardId ? { boardId: selectedBoardId } : "skip"
  );
  const boardDecks = useQuery(
    api.decks.listByBoard,
    selectedBoardId ? { boardId: selectedBoardId } : "skip"
  );

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

  const handleDeleteBoard = async (boardId: Id<"collections">) => {
    setDeleteBusy(true);
    try {
      await deleteBoard({ boardId });
      toast.success("Board deleted.");
      if (selectedBoardId === boardId) setSelectedBoardId(null);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Failed to delete board:", error);
      toast.error("Could not delete board.");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (boards === undefined) {
    return <div className="pd-fade-in" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>Loading…</div>;
  }

  if (selectedBoardId && selectedBoard) {
    const activeDecks = boardDecks ?? [];
    return (
      <div className="pd-scroll pd-fade-in" style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setSelectedBoardId(null)}
            aria-label="Back to boards"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "1px solid var(--pd-line-strong)",
              background: "rgba(255,255,255,0.025)",
              color: "var(--pd-ink-dim)",
            }}
          >
            <PinIcon name="chevron-left" size={14} />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--pd-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedBoard.name}
            </div>
            <div className="pd-mono" style={{ marginTop: 3, fontSize: 10.5, color: "var(--pd-ink-faint)" }}>
              {selectedBoard.imageIds.length} pin{selectedBoard.imageIds.length === 1 ? "" : "s"} · {activeDecks.length} deck{activeDecks.length === 1 ? "" : "s"}
            </div>
          </div>
          <div style={{ display: "inline-flex", gap: 4, border: "1px solid var(--pd-line-strong)", borderRadius: 4, padding: 3, background: "rgba(255,255,255,0.018)" }}>
            {([
              { id: "images", label: "Board" },
              { id: "decks", label: "Decks" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                style={{
                  borderRadius: 3,
                  padding: "5px 9px",
                  fontSize: 11,
                  background: detailTab === tab.id ? "var(--pd-accent-soft)" : "transparent",
                  color: detailTab === tab.id ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setConfirmDeleteId(selectedBoard._id)}
            aria-label="Delete board"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "1px solid rgba(239,67,67,0.3)",
              background: "rgba(239,67,67,0.1)",
              color: "rgba(255,190,190,0.92)",
            }}
          >
            <PinIcon name="close" size={14} />
          </button>
        </div>

        {detailTab === "images" ? (
          boardImages === undefined ? (
            <div className="pd-mono" style={{ color: "var(--pd-ink-faint)", fontSize: 10 }}>Loading board images…</div>
          ) : boardImages.length === 0 ? (
            <EmptyBoardDetail copy="This board has no images yet." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {boardImages.map((image: any) => (
                <button
                  key={image._id}
                  type="button"
                  onClick={() => onOpenImage(image)}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 4,
                    border: "1px solid var(--pd-line)",
                    background: "var(--pd-panel)",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ aspectRatio: "16/10", background: "#000", overflow: "hidden" }}>
                    <img
                      src={image.derivativeUrls?.medium || image.previewUrl || image.imageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ padding: "8px 9px 9px" }}>
                    <div style={{ fontSize: 12, color: "var(--pd-ink)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {image.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                      <PinSwatches colors={image.colors ?? []} size={9} gap={2} />
                      <span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}>
                        {image.group || image.genre || "image"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : boardDecks === undefined ? (
          <div className="pd-mono" style={{ color: "var(--pd-ink-faint)", fontSize: 10 }}>Loading board decks…</div>
        ) : activeDecks.length === 0 ? (
          <EmptyBoardDetail copy="No decks have been created from this board yet." action={
            selectedBoard.imageIds.length > 0 ? (
              <button
                type="button"
                onClick={() => void handleConvertToDeck(selectedBoard._id)}
                style={{ marginTop: 12, fontSize: 11, color: "var(--pd-accent)", background: "transparent" }}
              >
                Convert to Deck →
              </button>
            ) : null
          } />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {activeDecks.map((deck: any) => (
              <button
                key={deck._id}
                type="button"
                onClick={() => onOpenDeck(deck._id)}
                style={{
                  borderRadius: 4,
                  border: "1px solid var(--pd-line)",
                  background: "var(--pd-panel)",
                  padding: 10,
                  color: "var(--pd-ink)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deck.title}</div>
                <div className="pd-mono" style={{ marginTop: 5, fontSize: 10, color: "var(--pd-ink-faint)" }}>
                  {deck.slides?.length ?? 0} slide{deck.slides?.length === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        )}

        {confirmDeleteId && (
          <DeleteBoardConfirm
            boardName={selectedBoard.name}
            busy={deleteBusy}
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => void handleDeleteBoard(confirmDeleteId)}
          />
        )}
      </div>
    );
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
            <div
              key={b._id}
              onClick={() => {
                setSelectedBoardId(b._id);
                setDetailTab("images");
              }}
              style={{
                position: "relative",
                background: "var(--pd-panel)", border: "1px solid var(--pd-line)",
                borderRadius: 4, overflow: "hidden", cursor: "pointer",
              }}
            >
              <button
                type="button"
                aria-label={`Delete ${b.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDeleteId(b._id);
                }}
                style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  zIndex: 2,
                  width: 22,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(8,8,10,0.7)",
                  color: "var(--pd-ink-dim)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <PinIcon name="close" size={12} />
              </button>
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
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleConvertToDeck(b._id);
                  }}
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

      {confirmDeleteId && (
        <DeleteBoardConfirm
          boardName={boards.find((board) => board._id === confirmDeleteId)?.name ?? "this board"}
          busy={deleteBusy}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => void handleDeleteBoard(confirmDeleteId)}
        />
      )}
    </div>
  );
}

function EmptyBoardDetail({ copy, action }: { copy: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      border: "1px solid var(--pd-line)",
      borderRadius: 4,
      background: "rgba(255,255,255,0.012)",
      color: "var(--pd-ink-faint)",
      textAlign: "center",
      padding: 20,
    }}>
      <PinIcon name="board" size={26} stroke={1.2} />
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--pd-ink-mute)" }}>{copy}</div>
      {action}
    </div>
  );
}

function DeleteBoardConfirm({
  boardName,
  busy,
  onCancel,
  onConfirm,
}: {
  boardName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm board deletion"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--pd-glass-overlay)",
        backdropFilter: "blur(var(--pd-glass-overlay-blur))",
      }}
    >
      <div className="pd-glass-panel pd-fade-in" style={{ width: "min(380px, calc(100vw - 32px))", overflow: "hidden" }}>
        <div className="pd-glass-header" style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderBottom: "1px solid var(--pd-glass-line)" }}>
          <PinIcon name="close" size={13} />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--pd-ink)" }}>Delete board?</div>
        </div>
        <div style={{ padding: 14, color: "var(--pd-ink-dim)", fontSize: 12, lineHeight: 1.5 }}>
          Are you sure you want to delete <span style={{ color: "var(--pd-ink)" }}>{boardName}</span>? This removes the board, but does not delete the images from the library.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 12px", borderTop: "1px solid var(--pd-glass-line)", background: "var(--pd-glass-footer)" }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "var(--pd-ink-dim)", background: "rgba(255,255,255,0.025)" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} style={{ borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "rgba(255,210,210,0.95)", background: "rgba(239,67,67,0.16)", border: "1px solid rgba(239,67,67,0.3)" }}>
            {busy ? "Deleting..." : "Delete board"}
          </button>
        </div>
      </div>
    </div>
  );
}
