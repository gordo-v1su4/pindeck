import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HeartFilledIcon, EyeOpenIcon, ExternalLinkIcon, Cross2Icon, BookmarkIcon } from "@radix-ui/react-icons";
import { Dialog, Button, Badge, Text, Flex, Box, IconButton, Select, TextArea } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ImageModalProps {
  imageId: Id<"images">;
  onClose: () => void;
}

export function ImageModal({ imageId, onClose }: ImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const boards = useQuery(api.boards.list);
  const toggleLike = useMutation(api.images.toggleLike);
  const incrementViews = useMutation(api.images.incrementViews);
  const addImageToBoard = useMutation(api.boards.addImage);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  useEffect(() => {
    if (imageId) {
      incrementViews({ imageId });
    }
  }, [imageId, incrementViews]);

  const handleLike = async () => {
    try {
      await toggleLike({ imageId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast.error("Failed to update like status.");
    }
  };

  const handleSaveToBoard = async () => {
    if (!selectedBoardId || !image) return;
    
    try {
      await addImageToBoard({ 
        boardId: selectedBoardId as Id<"collections">, 
        imageId: image._id 
      });
      toast.success(`Image saved to board!`);
      setSelectedBoardId("");
    } catch (error) {
      console.error("Failed to save to board:", error);
      toast.error("Failed to save image to board.");
    }
  };

  if (!image) return null;

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content size="4" className="p-0">
        <Grid columns={{ initial: '1', md: '2' }} className="max-h-[90vh]">
          <Box className="flex items-center justify-center bg-black/90 md:rounded-l-lg overflow-hidden">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="max-h-[90vh] w-auto h-auto object-contain"
            />
          </Box>

          <Flex direction="column" className="p-6 space-y-4 overflow-y-auto">
            <Dialog.Close>
              <IconButton variant="ghost" color="gray" className="absolute top-3 right-3" aria-label="Close modal">
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>

            <Box>
              <Text as="h2" size="5" weight="bold" className="mb-2">
                {image.title}
              </Text>
              {image.description && (
                <Text as="p" size="2" color="gray" className="leading-relaxed">
                  {image.description}
                </Text>
              )}
            </Box>

            <Flex gap="4" align="center" className="text-gray-11">
              <Flex gap="1" align="center">
                <HeartFilledIcon className={image.isLiked ? 'text-red-500' : ''} />
                <Text size="2">{image.likes}</Text>
              </Flex>
              <Flex gap="1" align="center">
                <EyeOpenIcon />
                <Text size="2">{image.views}</Text>
              </Flex>
            </Flex>

            <Box className="space-y-3">
              <InfoRow label="Category">
                <Badge variant="soft" color="gray" size="1" className="capitalize">{image.category}</Badge>
              </InfoRow>

              {image.tags.length > 0 && (
                <InfoRow label="Tags">
                  <Flex gap="1" wrap="wrap">
                    {image.tags.map((tag) => <Badge key={tag} variant="soft" color="gray">{tag}</Badge>)}
                  </Flex>
                </InfoRow>
              )}

              {image.source && (
                <InfoRow label="Source">
                  <Button variant="ghost" size="1" asChild>
                    <a href={image.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                      View Original <ExternalLinkIcon />
                    </a>
                  </Button>
                </InfoRow>
              )}

              {image.sref && (
                <InfoRow label="Sref">
                  <Badge variant="soft" color="purple">{image.sref}</Badge>
                </InfoRow>
              )}

              {image.colors?.length > 0 && (
                <InfoRow label="Colors">
                  <Flex gap="2">
                    {image.colors.map((color, i) => (
                      <Box key={i} className="w-5 h-5 rounded-full border border-gray-6" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </Flex>
                </InfoRow>
              )}
            </Box>

            <Box className="pt-4 mt-auto border-t border-gray-6 space-y-3">
              <Button onClick={handleLike} variant={image.isLiked ? "solid" : "soft"} color={image.isLiked ? "red" : "gray"} size="2" className="w-full">
                <HeartFilledIcon /> {image.isLiked ? 'Liked' : 'Like'}
              </Button>

              {boards && boards.length > 0 && (
                <Flex gap="2">
                  <Select.Root value={selectedBoardId} onValueChange={setSelectedBoardId}>
                    <Select.Trigger placeholder="Add to a board..." size="2" className="flex-grow" />
                    <Select.Content>
                      {boards.map((b) => <Select.Item key={b._id} value={b._id}>{b.name}</Select.Item>)}
                    </Select.Content>
                  </Select.Root>
                  <Button onClick={handleSaveToBoard} variant="soft" size="2" disabled={!selectedBoardId}>
                    <BookmarkIcon /> Save
                  </Button>
                </Flex>
              )}
            </Box>
          </Flex>
        </Grid>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid columns="3" align="center">
      <Text size="2" color="gray" className="col-span-1">{label}</Text>
      <Box className="col-span-2">{children}</Box>
    </Grid>
  );
}
