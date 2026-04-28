import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinIcon } from "@/components/ui/pindeck";
import { SmartImage } from "@/components/SmartImage";
import type { Tweaks } from "./TweaksPanel";
import type { LibraryFilters } from "@/lib/libraryFilters";
import { applyLibraryFilters } from "@/lib/libraryFilters";
import {
  HeartIcon,
  HeartFilledIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { DropdownMenu, Flex } from "@radix-ui/themes";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { CreateBoardModal } from "@/components/CreateBoardModal";

interface GalleryViewProps {
  search: string;
  tweaks: Tweaks;
  onOpenImage: (img: any) => void;
  libraryFilter: LibraryFilters;
  /** Called after creating a board from the gallery flow (matches CreateBoardModal behavior). */
  onNavigateToBoards?: () => void;
}

const HEART_FILL = "rgba(248, 113, 113, 0.78)";
const HEART_OUTLINE = "rgba(255, 255, 255, 0.88)";
const BOOKMARK_SAVED = "rgba(96, 165, 250, 0.88)";
const BOOKMARK_OUTLINE = "rgba(255, 255, 255, 0.88)";
const ACTION_BG = "rgba(0,0,0,0.5)";
/** Same blue family as `--pd-accent-soft`, slightly tuned for menu rows */
const BOARD_ITEM_ACTIVE_BG = "color-mix(in srgb, var(--pd-accent) 16%, transparent)";
/** VAR chip: softer background/border/text than before */
const VAR_BADGE_BG = "rgba(0,0,0,0.52)";
const VAR_BADGE_BORDER = "rgba(58,123,255,0.2)";

const ICON_BTN = 22;
const ICON_SIZE = 12;

function ActionIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center rounded transition-transform active:scale-95"
      style={{
        width: ICON_BTN,
        height: ICON_BTN,
        border: "none",
        cursor: "pointer",
        background: ACTION_BG,
        backdropFilter: "blur(8px)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </button>
  );
}

export function GalleryView({ search, tweaks, onOpenImage, libraryFilter, onNavigateToBoards }: GalleryViewProps) {
  const images = useQuery(api.images.list, { limit: 200 });
  const boards = useQuery(api.boards.list);
  const toggleLike = useMutation(api.images.toggleLike);
  const addImageToBoard = useMutation(api.boards.addImage);

  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [createBoardImageId, setCreateBoardImageId] = useState<Id<"images"> | null>(null);
  /** Instant feedback while Convex syncs */
  const [likeOptimistic, setLikeOptimistic] = useState<Partial<Record<Id<"images">, boolean>>>({});
  /** Keeps tile actions visible while board menu is open (portal steals hover from `.group`). */
  const [bookmarkMenuFor, setBookmarkMenuFor] = useState<Id<"images"> | null>(null);

  const imageIdsOnBoards = useMemo(() => {
    const s = new Set<string>();
    if (!boards) return s;
    for (const b of boards) {
      for (const id of b.imageIds) s.add(String(id));
    }
    return s;
  }, [boards]);

  const filtered = useMemo(() => {
    if (!images) return [];
    let rows = applyLibraryFilters(images, libraryFilter);
    if (!search) return rows;
    const q = search.toLowerCase();
    rows = rows.filter((im) =>
      im.title.toLowerCase().includes(q) ||
      im.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
      im.sref?.toLowerCase().includes(q),
    );
    return rows;
  }, [images, search, libraryFilter]);

  const cols = tweaks.density === "dense" ? 5 : 4;
  const gap = tweaks.density === "dense" ? 6 : 10;

  const hoverClass = {
    lift: "pd-card-lift",
    tilt: "pd-card-tilt",
    zoom: "pd-card-zoom",
    flip: "pd-card-flip",
  }[tweaks.hover] || "pd-card-lift";

  const cardStyle = {
    bordered: { background: "var(--pd-panel)", border: "1px solid var(--pd-line)", borderRadius: 4 },
    bare: { background: "transparent", border: "0", borderRadius: 2 },
    glass: { background: "rgba(255,255,255,0.02)", border: "1px solid var(--pd-line-strong)", borderRadius: 6 },
    filmstrip: { background: "#000", border: "1px solid var(--pd-line-strong)", borderRadius: 2, padding: "8px 0" },
  }[tweaks.cardStyle] || { background: "var(--pd-panel)", border: "1px solid var(--pd-line)", borderRadius: 4 };

  const handleLike = useCallback(
    async (img: { _id: Id<"images">; isLiked?: boolean }, e: React.MouseEvent) => {
      e.stopPropagation();
      const id = img._id;
      setLikeOptimistic((s) => {
        const current = s[id] !== undefined ? s[id]! : !!img.isLiked;
        return { ...s, [id]: !current };
      });
      try {
        await toggleLike({ imageId: id });
        setLikeOptimistic((s) => {
          const { [id]: _, ...rest } = s;
          return rest;
        });
      } catch {
        setLikeOptimistic((s) => {
          const { [id]: _, ...rest } = s;
          return rest;
        });
        toast.error("Could not update like — try signing in.");
      }
    },
    [toggleLike],
  );

  const handleQuickSave = async (boardId: Id<"collections">, imageId: Id<"images">) => {
    try {
      await addImageToBoard({ boardId, imageId });
      toast.success("Saved to board");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("already in board")) {
        toast.error("Already on that board");
      } else {
        toast.error("Could not add to board");
      }
    }
  };

  if (images === undefined) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>
        <div className="pd-skeleton" style={{ width: 200, height: 20, borderRadius: 4 }} />
      </div>
    );
  }

  return (
    <>
      <div className="pd-scroll pd-fade-in" style={{ flex: 1, overflow: "auto", padding: "12px", position: "relative" }}>
        <div style={{ columnCount: cols, columnGap: gap, maxWidth: "100%" }}>
          {filtered.map((img, i) => {
            const isAi = !!img.parentImageId;
            const liked =
              likeOptimistic[img._id] !== undefined
                ? likeOptimistic[img._id]!
                : !!img.isLiked;
            const savedToBoard = imageIdsOnBoards.has(String(img._id));

            return (
              <div
                key={img._id}
                onClick={() => onOpenImage(img)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenImage(img);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`group ${hoverClass} pd-fade-in`}
                style={{
                  ...cardStyle,
                  cursor: "pointer",
                  overflow: "hidden",
                  breakInside: "avoid",
                  marginBottom: gap,
                  animationDelay: `${i * 18}ms`,
                }}
              >
                {tweaks.cardStyle === "filmstrip" && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px 6px", fontSize: 9 }} className="pd-mono">
                    <span style={{ color: "var(--pd-ink-mute)" }}>◯ {String(i + 1).padStart(3, "0")}</span>
                    <span style={{ color: "var(--pd-ink-faint)" }}>{img.sref || "—"}</span>
                  </div>
                )}
                <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", overflow: "hidden" }}>
                  <SmartImage image={img} variant="card" alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

                  <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4, alignItems: "center", zIndex: 2, maxWidth: "calc(100% - 88px)" }}>
                    {isAi && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 5px", borderRadius: 2, fontSize: 9, fontWeight: 600,
                        background: VAR_BADGE_BG,
                        color: "var(--pd-accent-ink)",
                        border: `1px solid ${VAR_BADGE_BORDER}`,
                        letterSpacing: "0.04em",
                        opacity: 0.88,
                      }} className="pd-mono">
                        <PinIcon name="sparkle" size={8} stroke={2.2} /> VAR
                      </span>
                    )}
                  </div>

                  <Flex
                    gap="6px"
                    align="center"
                    className={
                      bookmarkMenuFor === img._id
                        ? "absolute right-2 top-2 z-20 opacity-100 pointer-events-auto transition-opacity duration-200"
                        : "absolute right-2 top-2 z-20 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
                    }
                  >
                    <ActionIconButton label={liked ? "Unlike" : "Like"} onClick={(e) => void handleLike(img, e)}>
                      {liked ? (
                        <HeartFilledIcon width={ICON_SIZE} height={ICON_SIZE} color={HEART_FILL} />
                      ) : (
                        <HeartIcon width={ICON_SIZE} height={ICON_SIZE} color={HEART_OUTLINE} />
                      )}
                    </ActionIconButton>

                    <DropdownMenu.Root onOpenChange={(open) => setBookmarkMenuFor(open ? img._id : null)}>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          aria-label="Save to board"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center rounded transition-transform active:scale-95"
                          style={{
                            width: ICON_BTN,
                            height: ICON_BTN,
                            border: "none",
                            cursor: "pointer",
                            background: ACTION_BG,
                            backdropFilter: "blur(8px)",
                            boxShadow: "0 1px 8px rgba(0,0,0,0.35)",
                          }}
                        >
                          {savedToBoard ? (
                            <BookmarkFilledIcon width={ICON_SIZE} height={ICON_SIZE} color={BOOKMARK_SAVED} />
                          ) : (
                            <BookmarkIcon width={ICON_SIZE} height={ICON_SIZE} color={BOOKMARK_OUTLINE} />
                          )}
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content size="2" onClick={(e) => e.stopPropagation()}>
                        {boards && boards.length > 0 ? (
                          <>
                            {boards.map((board) => {
                              const onThisBoard = board.imageIds.includes(img._id);
                              return (
                                <DropdownMenu.Item
                                  key={board._id}
                                  style={onThisBoard ? { background: BOARD_ITEM_ACTIVE_BG } : undefined}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleQuickSave(board._id, img._id);
                                  }}
                                >
                                  {board.name}
                                </DropdownMenu.Item>
                              );
                            })}
                            <DropdownMenu.Separator />
                          </>
                        ) : (
                          <DropdownMenu.Item disabled>No boards yet</DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreateBoardImageId(img._id);
                            setCreateBoardModalOpen(true);
                          }}
                        >
                          <Flex align="center" gap="2">
                            <PlusIcon width="14" height="14" /> Create board
                          </Flex>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </Flex>

                  <div
                    className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    style={{
                      background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateBoardModal
        open={createBoardModalOpen}
        onOpenChange={(open) => {
          setCreateBoardModalOpen(open);
          if (!open) setCreateBoardImageId(null);
        }}
        imageId={createBoardImageId ?? undefined}
        setActiveTab={(tab) => {
          if (tab === "boards") onNavigateToBoards?.();
        }}
        incrementBoardVersion={() => {}}
      />
    </>
  );
}
