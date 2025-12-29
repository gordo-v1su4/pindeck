import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HeartIcon, EyeOpenIcon, ExternalLinkIcon, Cross2Icon, BookmarkIcon, PlusIcon } from "@radix-ui/react-icons";
import { Dialog, Button, Card, Badge, Text, Flex, Box, IconButton, DropdownMenu } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { CreateBoardModal } from "./CreateBoardModal";
import { getTagColor, sortColorsDarkToLight } from "../lib/utils";

interface ImageModalProps {
  imageId: Id<"images">;
  onClose: () => void;
  triggerPosition?: { x: number; y: number };
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}

export function ImageModal({ imageId, onClose, triggerPosition, setActiveTab, incrementBoardVersion }: ImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const boards = useQuery(api.boards.list);
  const toggleLike = useMutation(api.images.toggleLike);
  const incrementViews = useMutation(api.images.incrementViews);
  const addImageToBoard = useMutation(api.boards.addImage);
  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);

  useEffect(() => {
    if (imageId) {
      void incrementViews({ imageId });
    }
  }, [imageId, incrementViews]);

  // Sort colors dark to light for aesthetic gradient display
  // Must be called before early return to maintain hook order
  const sortedColors = useMemo(() => {
    if (!image?.colors || image.colors.length === 0) return [];
    return sortColorsDarkToLight(image.colors);
  }, [image?.colors]);

  // Generate display title from projectName + moodboardName or fallback to title
  // Must be called before early return to maintain hook order
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
      await addImageToBoard({ 
        boardId, 
        imageId: image._id 
      });
      toast.success("Image saved to board!");
    } catch (error: any) {
      console.error("Failed to save to board:", error);
      if (error.message?.includes("already in board")) {
        toast.error("Image is already in this board");
      } else {
        toast.error("Failed to save to board");
      }
    }
  };

  // Early return AFTER all hooks have been called
  if (!image) return null;

  return (
    <>
      <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Content 
          className="max-h-[85vh] p-0 !w-[70vw] !max-w-[600px] bg-gray-2"
          style={triggerPosition ? {
            position: 'fixed',
            top: `${Math.min(triggerPosition.y, window.innerHeight - 500)}px`,
            left: `${Math.min(triggerPosition.x, window.innerWidth - 600)}px`,
            transform: 'none'
          } : undefined}
        >
          <Dialog.Title className="sr-only">{displayTitle}</Dialog.Title>
          <Dialog.Description className="sr-only">Image details and metadata</Dialog.Description>
          <Flex direction="column" className="max-h-[90vh]">
            {/* Image Display */}
            <Box className="flex items-center justify-center bg-transparent aspect-video overflow-hidden">
              <img
                src={image.imageUrl}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </Box>

            {/* Content Panel */}
            <Box className="p-5 space-y-4 flex-1 overflow-y-auto border-t border-gray-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
              <Dialog.Close>
                <IconButton
                  variant="ghost"
                  color="gray"
                  className="absolute top-2 right-2"
                  aria-label="Close modal"
                >
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>

              {/* Project/Group Header - Prominent like ShotDeck */}
              {(image.projectName || image.group) && (
                <Box className="space-y-2 pb-3 border-b border-gray-6">
                  {image.projectName && (
                    <Text size="5" weight="bold" className="block">
                      {image.projectName}
                    </Text>
                  )}
                  {image.group && (
                    <Flex gap="2" align="center">
                      <Badge variant="soft" color="blue" size="2">
                        {image.group}
                      </Badge>
                      {image.moodboardName && (
                        <Text size="2" color="gray">
                          {image.moodboardName}
                        </Text>
                      )}
                    </Flex>
                  )}
                </Box>
              )}

              {/* Title (if different from project name) */}
              {(!image.projectName || image.title !== image.projectName) && (
                <Text size="3" weight="medium" className="block">
                  {image.title}
                </Text>
              )}

              {image.description && (
                <Text size="2" color="gray" className="leading-relaxed">
                  {image.description}
                </Text>
              )}

              <Flex gap="4" align="center">
                <Flex gap="2" align="center">
                  <HeartIcon width="14" height="14" />
                  <Text size="2" color="gray">{image.likes}</Text>
                </Flex>
                <Flex gap="2" align="center">
                  <EyeOpenIcon width="14" height="14" />
                  <Text size="2" color="gray">{image.views}</Text>
                </Flex>
              </Flex>

              <Box className="space-y-3">
                <Flex align="center" gap="3">
                  <Text size="2" color="gray" className="w-20 flex-shrink-0">Category:</Text>
                  <Badge variant="soft" color="gray" size="2" className="capitalize">
                    {image.category}
                  </Badge>
                </Flex>

                {/* Colors - Sorted dark to light gradient */}
                {sortedColors.length > 0 && (
                  <Flex align="start" gap="3">
                    <Text size="2" color="gray" className="w-20 flex-shrink-0">Colors:</Text>
                    <Flex gap="3" wrap="wrap" className="flex-1">
                      {sortedColors.map((color, index) => (
                        <Box
                          key={index}
                          className="w-10 h-10 border border-gray-6 flex-shrink-0"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </Flex>
                  </Flex>
                )}

                {image.tags.length > 0 && (
                  <Flex align="start" gap="3">
                    <Text size="2" color="gray" className="w-20 flex-shrink-0">Tags:</Text>
                    <Flex gap="1.5" wrap="wrap" className="flex-1">
                      {image.tags.map((tag, index) => (
                        <Badge key={index} variant="soft" color={getTagColor(tag)} size="1">
                          {tag}
                        </Badge>
                      ))}
                    </Flex>
                  </Flex>
                )}

                {image.source && (
                  <Flex align="center" gap="3">
                    <Text size="2" color="gray" className="w-20 flex-shrink-0">Source:</Text>
                    <Button
                      variant="soft"
                      color="blue"
                      size="1"
                      asChild
                      style={{ opacity: 0.8 }}
                    >
                      <a
                        href={image.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        View Original
                        <ExternalLinkIcon width="12" height="12" />
                      </a>
                    </Button>
                  </Flex>
                )}

                {image.sref && (
                  <Flex align="center" gap="3">
                    <Text size="2" color="gray" className="w-20 flex-shrink-0">Sref:</Text>
                    <Badge variant="soft" color="blue" size="1">
                      {image.sref}
                    </Badge>
                  </Flex>
                )}

                {image.uniqueId && (
                  <Flex align="center" gap="3">
                    <Text size="2" color="gray" className="w-20 flex-shrink-0">ID:</Text>
                    <Text size="1" color="gray" className="font-mono">
                      {image.uniqueId}
                    </Text>
                  </Flex>
                )}
              </Box>

              <Box className="pt-3 mt-3 border-t border-gray-6">
                <Flex gap="3" align="center">
                  <Button
                    onClick={() => { void handleLike(); }}
                    variant="soft"
                    color={image.isLiked ? "red" : "gray"}
                    size="2"
                    className="flex-1"
                    style={{ opacity: image.isLiked ? 0.9 : 0.7 }}
                  >
                    <HeartIcon width="16" height="16" />
                    {image.isLiked ? 'Liked' : 'Like'}
                  </Button>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <Button
                        variant="soft"
                        color="blue"
                        size="2"
                        className="flex-1"
                        style={{ opacity: 0.8 }}
                      >
                        <BookmarkIcon width="16" height="16" />
                        Save
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      {boards && boards.length > 0 ? (
                        <>
                          {boards.map((board) => (
                            <DropdownMenu.Item
                              key={board._id}
                              onClick={() => handleSaveToBoard(board._id)}
                            >
                              {board.name}
                            </DropdownMenu.Item>
                          ))}
                          <DropdownMenu.Separator />
                        </>
                      ) : null}
                      <DropdownMenu.Item
                        onClick={() => setCreateBoardModalOpen(true)}
                      >
                        <PlusIcon width="14" height="14" />
                        Create board
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>
              </Box>
            </Box>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <CreateBoardModal
        open={createBoardModalOpen}
        onOpenChange={(open) => {
          setCreateBoardModalOpen(open);
        }}
        imageId={image._id}
        setActiveTab={setActiveTab}
        incrementBoardVersion={incrementBoardVersion}
      />
    </>
  );
}
