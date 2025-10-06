import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HeartIcon, EyeOpenIcon, ExternalLinkIcon, Cross2Icon, BookmarkIcon } from "@radix-ui/react-icons";
import { Dialog, Button, Card, Badge, Text, Flex, Box, IconButton, Select } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ImageModalProps {
  imageId: Id<"images">;
  onClose: () => void;
  triggerPosition?: { x: number; y: number };
}

export function ImageModal({ imageId, onClose, triggerPosition }: ImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const boards = useQuery(api.boards.list);
  const toggleLike = useMutation(api.images.toggleLike);
  const incrementViews = useMutation(api.images.incrementViews);
  const addImageToBoard = useMutation(api.boards.addImage);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

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

  const handleSaveToBoard = async () => {
    if (!selectedBoardId || !image) return;
    
    try {
      await addImageToBoard({ 
        boardId: selectedBoardId as Id<"collections">, 
        imageId: image._id 
      });
      toast.success("Image saved to board!");
      setSelectedBoardId("");
    } catch (error) {
      console.error("Failed to save to board:", error);
      toast.error("Failed to save to board");
    }
  };

  if (!image) return null;

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content 
        maxWidth="lg" 
        className="max-h-[90vh] p-0 w-[600px]"
        style={triggerPosition ? {
          position: 'fixed',
          top: `${Math.min(triggerPosition.y, window.innerHeight - 600)}px`,
          left: `${Math.min(triggerPosition.x, window.innerWidth - 600)}px`,
          transform: 'none'
        } : undefined}
      >
        <Flex direction="column" className="max-h-[90vh]">
          {/* Image Display */}
          <Box className="flex items-center justify-center bg-black h-[400px] overflow-hidden">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="w-full h-full object-cover"
            />
          </Box>

          {/* Content Panel */}
          <Box className="p-4 space-y-3 flex-1 overflow-y-auto">
            <Dialog.Close>
              <IconButton
                variant="ghost"
                color="gray"
                className="absolute top-4 right-4"
                aria-label="Close modal"
              >
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>

            <Box>
              <Text size="3" weight="bold" className="mb-1">
                {image.title}
              </Text>
              {image.description && (
                <Text size="1" color="gray" className="leading-relaxed line-clamp-2">
                  {image.description}
                </Text>
              )}
            </Box>

            <Flex gap="3" align="center">
              <Flex gap="1" align="center">
                <HeartIcon width="12" height="12" />
                <Text size="1" color="gray">{image.likes}</Text>
              </Flex>
              <Flex gap="1" align="center">
                <EyeOpenIcon width="12" height="12" />
                <Text size="1" color="gray">{image.views}</Text>
              </Flex>
            </Flex>

            <Box className="space-y-2">
              <Flex align="center" gap="2">
                <Text size="1" color="gray">Category:</Text>
                <Badge variant="soft" color="gray" size="1" className="capitalize">
                  {image.category}
                </Badge>
              </Flex>

              {image.tags.length > 0 && (
                <Box>
                  <Text size="1" color="gray" className="block mb-1">Tags:</Text>
                  <Flex gap="1" wrap="wrap">
                    {image.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="soft" color="gray" size="1">
                        {tag}
                      </Badge>
                    ))}
                    {image.tags.length > 3 && (
                      <Badge variant="soft" color="gray" size="1">
                        +{image.tags.length - 3}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              )}

              {image.source && (
                <Flex align="center" gap="2">
                  <Text size="1" color="gray">Source:</Text>
                  <Button
                    variant="ghost"
                    size="1"
                    asChild
                  >
                    <a
                      href={image.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      View Original
                      <ExternalLinkIcon width="10" height="10" />
                    </a>
                  </Button>
                </Flex>
              )}

              {image.sref && (
                <Flex align="center" gap="2">
                  <Text size="1" color="gray">Sref:</Text>
                  <Badge variant="soft" color="purple" size="1">
                    {image.sref}
                  </Badge>
                </Flex>
              )}

              {image.colors && image.colors.length > 0 && (
                <Flex align="center" gap="2">
                  <Text size="1" color="gray">Colors:</Text>
                  <Flex gap="1">
                    {image.colors.map((color, index) => (
                      <Box
                        key={index}
                        className="w-4 h-4 rounded border border-gray-6"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </Flex>
                </Flex>
              )}
            </Box>

            <Box className="pt-3 border-t border-gray-6 space-y-2">
              <Button
                onClick={() => { void handleLike(); }}
                variant={image.isLiked ? "solid" : "soft"}
                color={image.isLiked ? "red" : "gray"}
                size="2"
                className="w-full"
              >
                <HeartIcon width="14" height="14" />
                {image.isLiked ? 'Liked' : 'Like'}
              </Button>

              {boards && boards.length > 0 && (
                <Box className="space-y-2">
                  <Select.Root
                    value={selectedBoardId}
                    onValueChange={setSelectedBoardId}
                  >
                    <Select.Trigger placeholder="Save to board..." size="2" className="w-full" />
                    <Select.Content>
                      {boards.map((board) => (
                        <Select.Item key={board._id} value={board._id}>
                          {board.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  
                  {selectedBoardId && (
                    <Button
                      onClick={handleSaveToBoard}
                      variant="soft"
                      color="blue"
                      size="2"
                      className="w-full"
                    >
                      <BookmarkIcon width="14" height="14" />
                      Save to Board
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
