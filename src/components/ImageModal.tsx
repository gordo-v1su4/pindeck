import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HeartIcon, HeartFilledIcon, Cross2Icon, BookmarkIcon, PlusIcon, MagicWandIcon, CopyIcon } from "@radix-ui/react-icons";
import { Dialog, Button, Text, Flex, Box, IconButton, DropdownMenu, Badge, Tooltip } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { CreateBoardModal } from "./CreateBoardModal";
import { GenerateVariationsModal } from "./GenerateVariationsModal";
import { sortColorsDarkToLight, getTagColor } from "../lib/utils";

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
      <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Content
          className="p-0 overflow-hidden"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '520px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            background: '#111',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            overflowY: 'auto',
          }}
        >
          <Dialog.Title className="sr-only">{displayTitle}</Dialog.Title>
          <Dialog.Description className="sr-only">Image details</Dialog.Description>

          {/* Close button - top right corner over image */}
          <IconButton
            variant="soft"
            color="gray"
            size="2"
            className="absolute top-3 right-3 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%' }}
            aria-label="Close"
            onClick={onClose}
          >
            <Cross2Icon />
          </IconButton>

          {/* Image - full width, natural aspect */}
          <Box style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}>
            <img
              src={image.imageUrl}
              alt={displayTitle}
              className="w-full h-full object-contain"
            />
          </Box>

          {/* Metadata panel */}
          <Box className="p-5">
            {/* Title row with copy */}
            <Flex align="center" justify="between" className="mb-2">
              <Text size="4" weight="bold" style={{ color: '#fff' }}>
                {displayTitle}
              </Text>
              <Tooltip content="Copy title">
                <IconButton
                  variant="ghost"
                  color="gray"
                  size="1"
                  onClick={() => copyToClipboard(displayTitle, 'Title')}
                >
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Flex>

            {/* Category & Group badges */}
            <Flex gap="2" className="mb-3">
              <Badge color="gray" variant="soft" style={{ textTransform: 'capitalize' }}>
                {image.category}
              </Badge>
              {image.group && (
                <Badge color="gray" variant="outline" style={{ textTransform: 'capitalize' }}>
                  {image.group}
                </Badge>
              )}
            </Flex>

            {/* Description with copy */}
            {image.description && (
              <Flex align="start" gap="2" className="mb-4">
                <Text size="2" style={{ color: '#aaa', lineHeight: 1.5, flex: 1 }}>
                  {image.description}
                </Text>
                <Tooltip content="Copy description">
                  <IconButton
                    variant="ghost"
                    color="gray"
                    size="1"
                    onClick={() => copyToClipboard(image.description || '', 'Description')}
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
              </Flex>
            )}

            {/* sref - code-style clickable box */}
            {image.sref && (
              <Flex
                align="center"
                gap="2"
                onClick={() => copyToClipboard(`--sref ${image.sref}`, 'sref code')}
                className="mb-3 cursor-pointer group"
                style={{
                  background: '#1a1a1a',
                  borderRadius: '4px',
                  border: '1px solid #333',
                  padding: '6px 10px',
                }}
              >
                <Text size="1" style={{ color: '#888', fontFamily: 'monospace' }}>
                  --sref
                </Text>
                <Text size="2" weight="medium" style={{ color: '#fff', fontFamily: 'monospace', flex: 1 }}>
                  {image.sref}
                </Text>
                <CopyIcon style={{ color: '#666' }} className="group-hover:text-white transition-colors" />
              </Flex>
            )}

            {/* Colors - clickable swatches */}
            {sortedColors.length > 0 && (
              <Box className="mb-4">
                <Text size="1" style={{ color: '#666' }} className="block mb-2">Colors</Text>
                <Flex gap="2" wrap="wrap">
                  {sortedColors.slice(0, 8).map((color, i) => (
                    <Tooltip key={i} content={`Copy ${color}`}>
                      <Box
                        onClick={() => copyToClipboard(color, 'Color')}
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: color,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                          transition: 'transform 0.1s',
                        }}
                        className="hover:scale-110"
                      />
                    </Tooltip>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Tags - colored badges matching table view */}
            {image.tags.length > 0 && (
              <Box className="mb-4">
                <Text size="1" style={{ color: '#666' }} className="block mb-2">Tags</Text>
                <Flex gap="1" wrap="wrap">
                  {image.tags.slice(0, 12).map((tag, i) => (
                    <Badge
                      key={i}
                      color={getTagColor(tag)}
                      variant="soft"
                      size="1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => copyToClipboard(tag, 'Tag')}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {image.tags.length > 12 && (
                    <Badge color="gray" variant="soft" size="1">
                      +{image.tags.length - 12}
                    </Badge>
                  )}
                </Flex>
              </Box>
            )}

            {/* Stats row */}
            <Flex gap="3" align="center" className="mb-4">
              <Text size="1" style={{ color: '#888' }}>♥ {image.likes}</Text>
              <Text size="1" style={{ color: '#888' }}>{image.views} views</Text>
            </Flex>

            {/* Action buttons */}
            <Flex gap="2">
              <Button
                onClick={() => { void handleLike(); }}
                variant="soft"
                color={image.isLiked ? "red" : "gray"}
                size="2"
              >
                {image.isLiked ? <HeartFilledIcon /> : <HeartIcon />}
                {image.isLiked ? 'Liked' : 'Like'}
              </Button>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button variant="soft" color={isSavedToAnyBoard ? "blue" : "gray"} size="2">
                    <BookmarkIcon /> {isSavedToAnyBoard ? 'Saved' : 'Save'}
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
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
                <DropdownMenu.Trigger>
                  <Button variant="soft" color="teal" size="2">
                    <MagicWandIcon /> Generate
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content className="dropdown-teal">
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
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Root>

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
