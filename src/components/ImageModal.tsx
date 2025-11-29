import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HeartIcon, EyeOpenIcon, ExternalLinkIcon, Cross2Icon, BookmarkIcon, PlusIcon } from "@radix-ui/react-icons";
import { Dialog, Button, Card, Badge, Text, Flex, Box, IconButton, DropdownMenu } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateBoardModal } from "./CreateBoardModal";
import { getTagColor } from "../lib/utils";

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

  if (!image) return null;

  return (
    <>
      <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Content 
          maxWidth="lg" 
          className="max-h-[90vh] p-0 w-[90vw] max-w-[900px]"
          style={triggerPosition ? {
            position: 'fixed',
            top: `${Math.min(triggerPosition.y, window.innerHeight - 600)}px`,
            left: `${Math.min(triggerPosition.x, window.innerWidth - 900)}px`,
            transform: 'none'
          } : undefined}
        >
          <Flex direction="column" className="max-h-[90vh]">
            {/* Image Display - No borders */}
            <Box className="flex items-center justify-center bg-transparent">
              <img
                src={image.imageUrl}
                alt={image.title}
                className="max-h-[60vh] w-auto object-contain"
              />
            </Box>

            {/* Content Panel - Transparent black like header */}
            <Box className="p-6 space-y-4 flex-1 overflow-y-auto bg-black/60 backdrop-blur-md border-t border-gray-6">
              <Dialog.Close>
                <IconButton
                  variant="ghost"
                  color="gray"
                  className="absolute top-3 right-3"
                  aria-label="Close modal"
                >
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>

              {image.description && (
                <Text size="2" color="gray" className="leading-relaxed">
                  {image.description}
                </Text>
              )}

              <Flex gap="5" align="center">
                <Flex gap="2" align="center">
                  <HeartIcon width="14" height="14" />
                  <Text size="2" color="gray">{image.likes} Likes</Text>
                </Flex>
                <Flex gap="2" align="center">
                  <EyeOpenIcon width="14" height="14" />
                  <Text size="2" color="gray">{image.views} Views</Text>
                </Flex>
              </Flex>

              <Box className="space-y-4">
                <Flex align="center" gap="3">
                  <Text size="2" color="gray" className="w-24 flex-shrink-0">Category:</Text>
                  <Badge variant="soft" color="gray" size="2" className="capitalize">
                    {image.category}
                  </Badge>
                </Flex>

                {image.tags.length > 0 && (
                  <Flex align="start" gap="3">
                    <Text size="2" color="gray" className="w-24 flex-shrink-0">Tags:</Text>
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
                    <Text size="2" color="gray" className="w-24 flex-shrink-0">Source:</Text>
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
                    <Text size="2" color="gray" className="w-24 flex-shrink-0">Sref:</Text>
                    <Badge variant="soft" color="blue" size="1">
                      {image.sref}
                    </Badge>
                  </Flex>
                )}

                {image.colors && image.colors.length > 0 && (
                  <Flex align="start" gap="3">
                    <Text size="2" color="gray" className="w-24 flex-shrink-0">Colors:</Text>
                    <Flex gap="2.5" wrap="wrap" className="flex-1">
                      {image.colors.map((color, index) => (
                        <Box
                          key={index}
                          className="w-6 h-6 rounded border border-gray-6 flex-shrink-0"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </Flex>
                  </Flex>
                )}
              </Box>

              <Box className="pt-4 mt-4 border-t border-gray-6">
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
