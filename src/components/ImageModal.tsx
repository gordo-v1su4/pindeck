import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HeartIcon, HeartFilledIcon, Cross2Icon, BookmarkIcon, PlusIcon, MagicWandIcon, CopyIcon } from "@radix-ui/react-icons";
import { DropdownMenu, Tooltip, IconButton } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { CreateBoardModal } from "./CreateBoardModal";
import { GenerateVariationsModal } from "./GenerateVariationsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SmartImage } from "./SmartImage";
import {
  compactImageTagClass,
  getPaletteTagStyle,
  sortColorsDarkToLight,
} from "../lib/utils";
import {
  CODE_BADGE_CLASS,
  ICON_BUTTON_ACTIVE_CLASS,
  ICON_BUTTON_CLASS,
  MODAL_CONTENT_CLASS,
  NEUTRAL_BADGE_CLASS,
  SECTION_LABEL_CLASS,
} from "@/components/ui/actionStyles";

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied!`);
};

interface ImageModalProps {
  imageId: Id<"images">;
  onClose: () => void;
  triggerPosition?: { x: number; y: number };
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}

export function ImageModal({ imageId, onClose, setActiveTab, incrementBoardVersion }: ImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const boards = useQuery(api.boards.list);
  const toggleLike = useMutation(api.images.toggleLike);
  const incrementViews = useMutation(api.images.incrementViews);
  const addImageToBoard = useMutation(api.boards.addImage);
  const generateOutput = useMutation(api.generations.generate);
  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [variationsModalOpen, setVariationsModalOpen] = useState(false);

  useEffect(() => {
    if (imageId) {
      void incrementViews({ imageId });
    }
  }, [imageId, incrementViews]);

  const sortedColors = useMemo(() => {
    if (!image?.colors || image.colors.length === 0) return [];
    return sortColorsDarkToLight(image.colors);
  }, [image?.colors]);
  const displayColors = sortedColors;

  const isSavedToAnyBoard = useMemo(() => {
    if (!boards || !imageId) return false;
    return boards.some(board => board.imageIds.includes(imageId));
  }, [boards, imageId]);

  const displayTitle = useMemo(() => {
    if (!image) return '';
    return image.projectName
      ? image.moodboardName
        ? `${image.projectName} - ${image.moodboardName}`
        : image.projectName
      : image.title;
  }, [image]);

  const detailBadges = useMemo(() => {
    const values = [image?.category, image?.group]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
    return values.filter(
      (value, index) =>
        values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index
    );
  }, [image?.category, image?.group]);

  const handleLike = async () => {
    try {
      await toggleLike({ imageId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleSaveToBoard = async (boardId: Id<"collections">) => {
    if (!image) return;
    try {
      await addImageToBoard({ boardId, imageId: image._id });
      toast.success("Saved to board!");
    } catch (error: any) {
      if (error.message?.includes("already in board")) {
        toast.error("Already in this board");
      } else {
        toast.error("Failed to save");
      }
    }
  };

  const handleGenerate = async (type: "storyboard" | "deck") => {
    try {
      const result = await generateOutput({ imageId, type });
      toast.success(`${result.templateName} created`);
    } catch (error) {
      toast.error("Failed to generate");
    }
  };

  if (!image) return null;

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className={`pindeck-image-modal ${MODAL_CONTENT_CLASS} w-[min(95vw,520px)] max-w-[520px] gap-0 rounded-[10px] p-0 text-[14px] text-white shadow-[0_24px_64px_rgba(0,0,0,0.58)]`}
        >
          <DialogTitle className="sr-only">{displayTitle}</DialogTitle>
          <DialogDescription className="sr-only">Image details</DialogDescription>

          {/* Close button - centered at the top edge */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-full bg-black/55 text-white/74 hover:bg-black/75 hover:text-white"
            aria-label="Close"
            onClick={onClose}
          >
            <Cross2Icon />
          </Button>

          {/* Image - full width, natural aspect */}
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}>
            <SmartImage
              image={image}
              variant="detail"
              alt={displayTitle}
              className="w-full h-full object-contain"
              loading="eager"
            />
          </div>

          {/* Metadata panel */}
          <div className="space-y-4 px-5 py-5">
            {/* Title row with copy */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 text-[14px] font-semibold leading-tight text-white">
                {displayTitle}
              </div>
              <Tooltip content="Copy title">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md text-white/48 hover:bg-white/[0.06] hover:text-white"
                  onClick={() => copyToClipboard(displayTitle, 'Title')}
                >
                  <CopyIcon />
                </Button>
              </Tooltip>
            </div>

            {/* Category & Group badges */}
            <div className="flex flex-wrap gap-2">
              {detailBadges.map((value) => (
                <Badge
                  key={value}
                  variant="outline"
                  className={NEUTRAL_BADGE_CLASS}
                >
                  {value}
                </Badge>
              ))}
            </div>

            {/* Description with copy */}
            {image.description && (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-[13px] leading-6 text-white/66">
                  {image.description}
                </p>
                <Tooltip content="Copy description">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-md text-white/48 hover:bg-white/[0.06] hover:text-white"
                    onClick={() => copyToClipboard(image.description || '', 'Description')}
                  >
                    <CopyIcon />
                  </Button>
                </Tooltip>
              </div>
            )}

            {/* sref - code-style clickable box */}
            {image.sref && (
              <button
                type="button"
                onClick={() => copyToClipboard(`--sref ${image.sref}`, 'sref code')}
                className="group flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/18 hover:bg-white/[0.05]"
              >
                <Badge variant="outline" className={CODE_BADGE_CLASS}>
                  {image.sref}
                </Badge>
                <span className="flex-1 text-[9px] uppercase tracking-[0.12em] text-white/48">
                  SREF
                </span>
                <CopyIcon className="text-white/35 transition-colors group-hover:text-white/80" />
              </button>
            )}

            {/* Colors - clickable swatches */}
            {displayColors.length > 0 && (
              <div>
                <div className={SECTION_LABEL_CLASS}>Colors</div>
                <div className="flex flex-wrap gap-2">
                  {displayColors.slice(0, 8).map((color, i) => (
                    <Tooltip key={i} content={`Copy ${color}`}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(color, 'Color')}
                        aria-label={`Copy ${color}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          backgroundColor: color,
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.12)',
                          transition: 'transform 0.1s',
                        }}
                        className="border border-white/10 hover:scale-110"
                      />
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Tags - matches EditImageModal exactly */}
            {image.tags.length > 0 && (
              <div>
                <div className={SECTION_LABEL_CLASS}>Tags</div>
                <div className="flex flex-wrap gap-2">
                  {image.tags.slice(0, 12).map((tag, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`${compactImageTagClass} cursor-pointer border-0`}
                      style={getPaletteTagStyle(image.colors, i, Math.min(image.tags.length, 12))}
                      onClick={() => copyToClipboard(tag, 'Tag')}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {image.tags.length > 12 && (
                    <Badge
                      variant="outline"
                      className={`${compactImageTagClass} border-0 bg-white/[0.06] text-white/60`}
                    >
                      +{image.tags.length - 12}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px] text-white/44">
              <span>♥ {image.likes}</span>
              <span>{image.views.toString().padStart(2, '0')} views</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <IconButton
                onClick={() => { void handleLike(); }}
                variant="soft"
                color={image.isLiked ? "red" : "gray"}
                size="2"
                aria-label={image.isLiked ? "Unlike image" : "Like image"}
                style={{ opacity: 0.9 }}
              >
                {image.isLiked ? <HeartFilledIcon /> : <HeartIcon />}
              </IconButton>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <IconButton
                    variant="soft"
                    color="gray"
                    size="2"
                    className={isSavedToAnyBoard ? ICON_BUTTON_ACTIVE_CLASS : ICON_BUTTON_CLASS}
                    aria-label="Save to board"
                  >
                    <BookmarkIcon />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={8}
                  collisionPadding={16}
                  className="z-[90] min-w-[11rem]"
                  style={{ zIndex: 90 }}
                >
                  {boards && boards.length > 0 && boards.map((board) => (
                    <DropdownMenu.Item key={board._id} onClick={() => void handleSaveToBoard(board._id)}>
                      {board.name}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item onClick={() => setCreateBoardModalOpen(true)}>
                    <PlusIcon width="14" height="14" /> New board
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <IconButton
                    variant="soft"
                    color="gray"
                    size="2"
                    className={ICON_BUTTON_ACTIVE_CLASS}
                    aria-label="Generate options"
                  >
                    <MagicWandIcon />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={8}
                  collisionPadding={16}
                  className="z-[90] min-w-[11rem]"
                  style={{ zIndex: 90 }}
                >
                  <DropdownMenu.Item onClick={() => setVariationsModalOpen(true)}>
                    Variations
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => void handleGenerate("storyboard")}>
                    Storyboard
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => void handleGenerate("deck")}>
                    Deck
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GenerateVariationsModal
        imageId={image._id}
        open={variationsModalOpen}
        onOpenChange={setVariationsModalOpen}
      />

      <CreateBoardModal
        open={createBoardModalOpen}
        onOpenChange={setCreateBoardModalOpen}
        imageId={image._id}
        setActiveTab={setActiveTab}
        incrementBoardVersion={incrementBoardVersion}
      />
    </>
  );
}
