import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinChip, PinIcon } from "@/components/ui/pindeck";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

interface BoardsViewProps {
  onOpenDeck: (deckId: Id<"decks">) => void;
  onOpenImage: (image: any) => void;
}

type BoardDetailTab = "images" | "decks";
type StoryboardStyle = "grid" | "hero" | "strip";
type StoryboardGridSize = 2 | 3 | 4 | 5;
type StoryboardPanel = {
  id: string;
  style: StoryboardStyle;
  gridSize: StoryboardGridSize;
  slots: Array<string | null>;
  collapsed: boolean;
  note: string;
};

const STORYBOARD_GRID_OPTIONS: StoryboardGridSize[] = [2, 3, 4, 5];
const STORYBOARD_STYLE_OPTIONS: Array<{
  id: StoryboardStyle;
  label: string;
  icon: string;
}> = [
  { id: "grid", label: "Grid", icon: "grid" },
  { id: "hero", label: "Hero", icon: "image" },
  { id: "strip", label: "Strip", icon: "film" },
];

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
            <BoardStoryboardWorkspace
              key={selectedBoard._id}
              boardId={selectedBoard._id}
              boardName={selectedBoard.name}
              images={boardImages}
              onOpenImage={onOpenImage}
            />
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
              role="button"
              tabIndex={0}
              title={`Double-click to open ${b.name}`}
              onDoubleClick={() => {
                setSelectedBoardId(b._id);
                setDetailTab("images");
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
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

function BoardStoryboardWorkspace({
  boardId,
  boardName,
  images,
  onOpenImage,
}: {
  boardId: Id<"collections">;
  boardName: string;
  images: any[];
  onOpenImage: (image: any) => void;
}) {
  const savedStoryboards = useQuery(api.storyboards.listByBoard, { boardId });
  const saveBoardLayout = useMutation(api.storyboards.saveBoardLayout);
  const imageById = React.useMemo(() => {
    return new Map(images.map((image) => [String(image._id), image]));
  }, [images]);
  const [panels, setPanels] = useState<StoryboardPanel[]>(() => [
    createStoryboardPanel(0, { style: "grid", gridSize: 3 }),
    createStoryboardPanel(1, { style: "hero", gridSize: 3 }),
  ]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [hydratedBoardId, setHydratedBoardId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const usedImageIds = React.useMemo(() => {
    const used = new Set<string>();
    panels.forEach((panel) => {
      panel.slots.forEach((imageId) => {
        if (imageId) used.add(imageId);
      });
    });
    return used;
  }, [panels]);

  useEffect(() => {
    if (savedStoryboards === undefined || hydratedBoardId === String(boardId)) return;
    const saved = savedStoryboards[0];
    if (saved?.layoutState?.frames?.length) {
      setPanels(saved.layoutState.frames.map((frame, index) => ({
        id: frame.id || `storyboard-saved-${index}`,
        style: isStoryboardStyle(frame.style) ? frame.style : "grid",
        gridSize: isStoryboardGridSize(frame.gridSize) ? frame.gridSize : 3,
        collapsed: Boolean(frame.collapsed),
        note: frame.note ?? "",
        slots: resizeSlots(
          frame.slots.map((slot) => slot ? String(slot) : null),
          storyboardSlotCount(
            isStoryboardStyle(frame.style) ? frame.style : "grid",
            isStoryboardGridSize(frame.gridSize) ? frame.gridSize : 3,
          ),
        ),
      })));
      setSaveState("saved");
    }
    setHydratedBoardId(String(boardId));
  }, [boardId, hydratedBoardId, savedStoryboards]);

  const markDirty = () => {
    setSaveState((current) => current === "saving" ? current : "idle");
  };

  const addPanel = () => {
    markDirty();
    setPanels((current) => [
      ...current,
      createStoryboardPanel(current.length, { style: "grid", gridSize: 3 }),
    ]);
  };

  const updatePanelLayout = (
    panelId: string,
    patch: Partial<Pick<StoryboardPanel, "style" | "gridSize">>,
  ) => {
    markDirty();
    setPanels((current) =>
      current.map((panel) => {
        if (panel.id !== panelId) return panel;
        const nextPanel = { ...panel, ...patch };
        const nextSlotCount = storyboardSlotCount(nextPanel.style, nextPanel.gridSize);
        return {
          ...nextPanel,
          slots: resizeSlots(panel.slots, nextSlotCount),
        };
      }),
    );
  };

  const updatePanelNote = (panelId: string, note: string) => {
    markDirty();
    setPanels((current) =>
      current.map((panel) => panel.id === panelId ? { ...panel, note } : panel),
    );
  };

  const togglePanelCollapsed = (panelId: string) => {
    markDirty();
    setPanels((current) =>
      current.map((panel) =>
        panel.id === panelId ? { ...panel, collapsed: !panel.collapsed } : panel,
      ),
    );
  };

  const isImageAlreadyUsed = (
    imageId: string,
    source?: { panelId: string; slotIndex: number },
  ) => {
    return panels.some((panel) =>
      panel.slots.some((slot, slotIndex) => {
        if (slot !== imageId) return false;
        return !(source && panel.id === source.panelId && slotIndex === source.slotIndex);
      }),
    );
  };

  const insertImageIntoPanel = (
    panelId: string,
    slotIndex: number,
    imageId: string,
    source?: { panelId: string; slotIndex: number },
  ) => {
    markDirty();
    setPanels((current) => {
      const withoutSource = current.map((panel) => {
        if (source?.panelId !== panel.id) return panel;
        const slots = [...panel.slots];
        slots[source.slotIndex] = null;
        return { ...panel, slots };
      });

      return withoutSource.map((panel) => {
        if (panel.id !== panelId) return panel;
        return {
          ...panel,
          slots: insertIntoSlots(panel.slots, slotIndex, imageId),
        };
      });
    });
  };

  const placeImageIntoPanel = (
    panelId: string,
    slotIndex: number,
    imageId: string,
    source?: { panelId: string; slotIndex: number },
  ) => {
    if (isImageAlreadyUsed(imageId, source)) {
      toast.info("Shot already used in this storyboard.");
      return;
    }
    insertImageIntoPanel(panelId, slotIndex, imageId, source);
  };

  const clearSlot = (panelId: string, slotIndex: number) => {
    markDirty();
    setPanels((current) =>
      current.map((panel) => {
        if (panel.id !== panelId) return panel;
        const slots = [...panel.slots];
        slots[slotIndex] = null;
        return { ...panel, slots };
      }),
    );
  };

  const handleShotDragStart = (
    event: React.DragEvent<HTMLElement>,
    imageId: string,
  ) => {
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData(
      "application/x-pindeck-shot",
      JSON.stringify({ kind: "shot", imageId }),
    );
  };

  const handleSlotDragStart = (
    event: React.DragEvent<HTMLElement>,
    panelId: string,
    slotIndex: number,
    imageId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-pindeck-shot",
      JSON.stringify({ kind: "slot", panelId, slotIndex, imageId }),
    );
  };

  const handleDrop = (
    event: React.DragEvent<HTMLElement>,
    panelId: string,
    slotIndex: number,
  ) => {
    event.preventDefault();
    const payload = readStoryboardDragPayload(event);
    setDropTarget(null);
    if (!payload?.imageId) return;
    placeImageIntoPanel(
      panelId,
      slotIndex,
      payload.imageId,
      payload.kind === "slot"
        ? { panelId: payload.panelId, slotIndex: payload.slotIndex }
        : undefined,
    );
  };

  const saveLayout = async () => {
    setSaveState("saving");
    try {
      await saveBoardLayout({
        boardId,
        title: `${boardName} Storyboard`,
        frames: panels.map((panel) => ({
          id: panel.id,
          style: panel.style,
          gridSize: panel.gridSize,
          collapsed: panel.collapsed,
          note: panel.note,
          slots: panel.slots.map((slot) => slot as Id<"images"> | null),
        })),
      });
      setSaveState("saved");
      toast.success("Storyboard locked to this board.");
    } catch (error) {
      console.error("Failed to save storyboard:", error);
      setSaveState("idle");
      toast.error("Could not lock storyboard.");
    }
  };

  return (
    <div className="pd-board-workspace">
      <section className="pd-board-shot-rail" aria-label="Board shots">
        <div className="pd-board-section-head">
          <div>
            <div className="pd-board-section-title">Shots</div>
            <div className="pd-board-section-meta">{images.length} selected</div>
          </div>
        </div>
        <div className="pd-board-shot-grid">
          {images.map((image) => {
            const imageId = String(image._id);
            const isUsed = usedImageIds.has(imageId);
            return (
              <button
                key={image._id}
                type="button"
                draggable
                className={[
                  "pd-board-shot-thumb",
                  selectedShotId === imageId ? "is-selected" : "",
                  isUsed ? "is-used" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => {
                  setSelectedShotId(imageId);
                  onOpenImage(image);
                }}
                onDragStart={(event) => handleShotDragStart(event, imageId)}
                aria-label={`${isUsed ? "Used shot" : "Open"} ${image.title || "board shot"}`}
                title={isUsed ? "Used in this storyboard" : image.title || "Board shot"}
              >
                <img src={pickBoardImageUrl(image)} alt="" draggable={false} />
                {isUsed && (
                  <span className="pd-board-shot-used" aria-hidden="true">
                    <PinIcon name="close" size={34} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="pd-storyboard-builder" aria-label="Storyboard builder">
        <div className="pd-board-section-head">
          <div>
            <div className="pd-board-section-title">Storyboard</div>
            <div className="pd-board-section-meta">{panels.length} frames</div>
          </div>
          <div className="pd-board-builder-actions">
            <button
              type="button"
              className="pd-board-save-layout"
              onClick={() => void saveLayout()}
              disabled={saveState === "saving"}
            >
              <PinIcon name={saveState === "saved" ? "check" : "lock"} size={13} />
              {saveState === "saving" ? "Locking" : saveState === "saved" ? "Locked" : "Lock Board"}
            </button>
            <button type="button" className="pd-board-add-panel" onClick={addPanel}>
              <PinIcon name="plus" size={13} />
              Add
            </button>
          </div>
        </div>

        <div className="pd-storyboard-stack">
          {panels.map((panel, panelIndex) => (
            <article key={panel.id} className="pd-storyboard-panel">
              <div className="pd-storyboard-toolbar">
                <div className="pd-storyboard-panel-label">
                  <span className="pd-mono">{String(panelIndex + 1).padStart(2, "0")}</span>
                </div>
                <div className="pd-storyboard-control-group" aria-label="Storyboard style">
                  {STORYBOARD_STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      aria-pressed={panel.style === style.id}
                      className={panel.style === style.id ? "is-active" : ""}
                      onClick={() => updatePanelLayout(panel.id, { style: style.id })}
                    >
                      <PinIcon name={style.icon} size={12} />
                      {style.label}
                    </button>
                  ))}
                </div>
                <div className="pd-storyboard-control-group" aria-label="Storyboard grid size">
                  {STORYBOARD_GRID_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={panel.gridSize === size}
                      className={panel.gridSize === size ? "is-active" : ""}
                      onClick={() => updatePanelLayout(panel.id, { gridSize: size })}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="pd-storyboard-collapse-button"
                  onClick={() => togglePanelCollapsed(panel.id)}
                >
                  <PinIcon name={panel.collapsed ? "expand" : "eye-off"} size={12} />
                  {panel.collapsed ? "Expand" : "Minimize"}
                </button>
              </div>

              {panel.collapsed ? (
                <StoryboardMinimizedPanel
                  panel={panel}
                  panelIndex={panelIndex}
                  imageById={imageById}
                  onOpenImage={onOpenImage}
                  onNoteChange={updatePanelNote}
                />
              ) : (
                <div
                  className={`pd-storyboard-frame pd-storyboard-${panel.style}`}
                  style={storyboardGridStyle(panel)}
                >
                  {panel.slots.map((imageId, slotIndex) => {
                    const image = imageId ? imageById.get(imageId) : null;
                    const targetKey = `${panel.id}:${slotIndex}`;
                    return (
                      <div
                        key={`${panel.id}-${slotIndex}`}
                        role="button"
                        tabIndex={0}
                        draggable={Boolean(image)}
                        className={[
                          "pd-storyboard-slot",
                          image ? "is-filled" : "",
                          dropTarget === targetKey ? "is-hot" : "",
                        ].filter(Boolean).join(" ")}
                        style={storyboardSlotStyle(panel, slotIndex)}
                        onClick={() => {
                          if (!image && selectedShotId) {
                            placeImageIntoPanel(panel.id, slotIndex, selectedShotId);
                            return;
                          }
                          if (image) onOpenImage(image);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Delete" || event.key === "Backspace") {
                            if (image) clearSlot(panel.id, slotIndex);
                            return;
                          }
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          if (!image && selectedShotId) {
                            placeImageIntoPanel(panel.id, slotIndex, selectedShotId);
                            return;
                          }
                          if (image) onOpenImage(image);
                        }}
                        onDoubleClick={() => image && clearSlot(panel.id, slotIndex)}
                        onDragStart={(event) => {
                          if (!image) return;
                          handleSlotDragStart(event, panel.id, slotIndex, imageId!);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropTarget(targetKey);
                        }}
                        onDragLeave={() => {
                          setDropTarget((current) => current === targetKey ? null : current);
                        }}
                        onDrop={(event) => handleDrop(event, panel.id, slotIndex)}
                        aria-label={
                          image
                            ? `Open ${image.title || "storyboard shot"}`
                            : selectedShotId
                              ? "Place selected shot"
                              : "Empty storyboard slot"
                        }
                      >
                        {image ? (
                          <>
                            <img src={pickBoardImageUrl(image)} alt="" draggable={false} />
                            <button
                              type="button"
                              className="pd-storyboard-slot-remove"
                              onClick={(event) => {
                                event.stopPropagation();
                                clearSlot(panel.id, slotIndex);
                              }}
                              aria-label={`Remove ${image.title || "storyboard shot"}`}
                              title="Remove from storyboard"
                            >
                              <PinIcon name="close" size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="pd-storyboard-empty-mark">
                            <PinIcon name="plus" size={14} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function createStoryboardPanel(
  index: number,
  options: { style: StoryboardStyle; gridSize: StoryboardGridSize },
): StoryboardPanel {
  return {
    id: `storyboard-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    style: options.style,
    gridSize: options.gridSize,
    slots: Array(storyboardSlotCount(options.style, options.gridSize)).fill(null),
    collapsed: false,
    note: "",
  };
}

function StoryboardMinimizedPanel({
  panel,
  panelIndex,
  imageById,
  onOpenImage,
  onNoteChange,
}: {
  panel: StoryboardPanel;
  panelIndex: number;
  imageById: Map<string, any>;
  onOpenImage: (image: any) => void;
  onNoteChange: (panelId: string, note: string) => void;
}) {
  const representativeImageId = panel.slots.find(Boolean);
  const representativeImage = representativeImageId
    ? imageById.get(representativeImageId)
    : null;

  return (
    <div className="pd-storyboard-minimized">
      <button
        type="button"
        className="pd-storyboard-mini-thumb"
        onClick={() => representativeImage && onOpenImage(representativeImage)}
        aria-label={
          representativeImage
            ? `Open ${representativeImage.title || "storyboard cover shot"}`
            : `Storyboard ${panelIndex + 1} has no cover shot`
        }
      >
        {representativeImage ? (
          <img src={pickBoardImageUrl(representativeImage)} alt="" draggable={false} />
        ) : (
          <span>
            <PinIcon name="image" size={16} />
          </span>
        )}
      </button>
      <textarea
        className="pd-storyboard-note"
        value={panel.note}
        onChange={(event) => onNoteChange(panel.id, event.target.value)}
        placeholder="Add notes..."
        aria-label={`Notes for storyboard ${panelIndex + 1}`}
      />
    </div>
  );
}

function storyboardSlotCount(style: StoryboardStyle, gridSize: StoryboardGridSize) {
  if (style === "hero") return gridSize * 2;
  if (style === "strip") return gridSize + 1;
  return gridSize * gridSize;
}

function isStoryboardStyle(value: unknown): value is StoryboardStyle {
  return value === "grid" || value === "hero" || value === "strip";
}

function isStoryboardGridSize(value: unknown): value is StoryboardGridSize {
  return value === 2 || value === 3 || value === 4 || value === 5;
}

function resizeSlots(slots: Array<string | null>, nextLength: number) {
  const resized = slots.slice(0, nextLength);
  while (resized.length < nextLength) resized.push(null);
  return resized;
}

function insertIntoSlots(slots: Array<string | null>, slotIndex: number, imageId: string) {
  const next = [...slots];
  if (next[slotIndex] === null) {
    next[slotIndex] = imageId;
    return next;
  }
  for (let index = next.length - 1; index > slotIndex; index -= 1) {
    next[index] = next[index - 1];
  }
  next[slotIndex] = imageId;
  return next;
}

function pickBoardImageUrl(image: any) {
  return image.derivativeUrls?.medium || image.previewUrl || image.imageUrl;
}

function readStoryboardDragPayload(event: React.DragEvent) {
  try {
    const raw = event.dataTransfer.getData("application/x-pindeck-shot");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | { kind: "shot"; imageId: string }
      | { kind: "slot"; imageId: string; panelId: string; slotIndex: number };
    return parsed;
  } catch {
    return null;
  }
}

function storyboardGridStyle(panel: StoryboardPanel): React.CSSProperties {
  if (panel.style === "strip") {
    return {
      gridTemplateColumns: `repeat(${panel.gridSize}, minmax(0, 1fr))`,
      gridTemplateRows: "2.1fr 1fr",
    };
  }
  return {
    gridTemplateColumns: `repeat(${panel.gridSize}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${panel.gridSize}, minmax(0, 1fr))`,
  };
}

function storyboardSlotStyle(panel: StoryboardPanel, slotIndex: number): React.CSSProperties {
  if (panel.style === "hero" && slotIndex === 0) {
    const span = Math.max(1, panel.gridSize - 1);
    return {
      gridColumn: `span ${span}`,
      gridRow: `span ${span}`,
    };
  }
  if (panel.style === "strip" && slotIndex === 0) {
    return {
      gridColumn: "1 / -1",
    };
  }
  return {};
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
