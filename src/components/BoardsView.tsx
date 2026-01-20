import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Card, Text, Flex, Box, Button, Badge, IconButton, Grid, Dialog } from "@radix-ui/themes";
import { PlusIcon, TrashIcon, Pencil1Icon, EyeOpenIcon, BookmarkIcon, Cross2Icon, ArrowLeftIcon, HeartIcon } from "@radix-ui/react-icons";
import { CreateBoardModal } from "./CreateBoardModal";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function BoardsView({ setActiveTab, incrementBoardVersion }: { setActiveTab: (tab: string) => void, incrementBoardVersion: () => void }) {
  const boards = useQuery(api.boards.list);
  const deleteBoard = useMutation(api.boards.deleteBoard);
  const createStoryboard = useMutation(api.storyboards.createFromBoard);
  const createDeck = useMutation(api.decks.createFromBoard);
  const removeImageFromBoard = useMutation(api.boards.removeImage);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"collections"> | null>(null);
  
  // Get the selected board details
  const selectedBoard = boards?.find(b => b._id === selectedBoardId);
  const boardImages = useQuery(
    api.boards.getBoardImages,
    selectedBoardId ? { boardId: selectedBoardId } : "skip"
  );

  const handleDeleteBoard = async (boardId: Id<"collections">) => {
    if (!confirm("Are you sure you want to delete this board?")) return;
    
    try {
      await deleteBoard({ boardId });
      toast.success("Board deleted successfully!");
    } catch (error) {
      console.error("Failed to delete board:", error);
      toast.error("Failed to delete board");
    }
  };

  const handleConvertToStoryboard = async (boardId: Id<"collections">) => {
    try {
      await createStoryboard({ boardId });
      toast.success("Storyboard created from board!");
    } catch (error) {
      console.error("Failed to convert board to storyboard:", error);
      toast.error("Failed to convert board");
    }
  };

  const handleConvertToDeck = async (boardId: Id<"collections">) => {
    try {
      await createDeck({ boardId });
      toast.success("Deck created from board!");
    } catch (error) {
      console.error("Failed to convert board to deck:", error);
      toast.error("Failed to convert board");
    }
  };

  const handleRemoveFromBoard = async (imageId: Id<"images">) => {
    if (!selectedBoardId) return;
    try {
      await removeImageFromBoard({ boardId: selectedBoardId, imageId });
      toast.success("Image removed from board");
    } catch (error) {
      console.error("Failed to remove image:", error);
      toast.error("Failed to remove image");
    }
  };

  // If a board is selected, show the board detail view
  if (selectedBoardId && selectedBoard) {
    return (
      <Box className="space-y-6 w-full">
        {/* Header with back button */}
        <Flex justify="between" align="center" className="flex-col sm:flex-row gap-4">
          <Flex align="center" gap="3">
            <IconButton
              variant="ghost"
              size="3"
              onClick={() => setSelectedBoardId(null)}
            >
              <ArrowLeftIcon width="20" height="20" />
            </IconButton>
            <Box>
              <Text size="7" weight="bold">{selectedBoard.name}</Text>
              {selectedBoard.description && (
                <Text size="3" color="gray" className="mt-1">
                  {selectedBoard.description}
                </Text>
              )}
            </Box>
          </Flex>
          <Flex gap="2">
            <Badge variant="soft" color="gray" size="2">
              {selectedBoard.imageIds.length} images
            </Badge>
            {selectedBoard.isPublic && (
              <Badge variant="soft" color="blue" size="2">
                Public
              </Badge>
            )}
          </Flex>
        </Flex>

        {/* Board images grid */}
        {!boardImages ? (
          <Box className="text-center py-16">
            <Text color="gray">Loading images...</Text>
          </Box>
        ) : boardImages.length === 0 ? (
          <Box className="text-center py-20">
            <BookmarkIcon width="48" height="48" className="mx-auto mb-4 text-gray-400" />
            <Text size="4" color="gray" className="mb-4">
              No images in this board yet
            </Text>
            <Text size="3" color="gray">
              Save images from the gallery to add them here
            </Text>
          </Box>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
            {boardImages.map((image) => (
              <Box
                key={image._id}
                className="break-inside-avoid group cursor-pointer relative"
              >
                <Box className="relative overflow-hidden aspect-video bg-gray-900 rounded-lg">
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Overlay on hover */}
                  <Box className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200">
                    {/* Remove button */}
                    <Flex className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <IconButton
                        variant="solid"
                        color="red"
                        size="1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromBoard(image._id);
                        }}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>
                    
                    {/* Image info */}
                    <Box className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Text size="2" weight="medium" className="text-white mb-1 line-clamp-2">
                        {image.title}
                      </Text>
                      <Flex gap="3" align="center">
                        <Flex gap="1" align="center">
                          <HeartIcon width="12" height="12" className="text-gray-300" />
                          <Text size="1" className="text-gray-300">{image.likes}</Text>
                        </Flex>
                        <Flex gap="1" align="center">
                          <EyeOpenIcon width="12" height="12" className="text-gray-300" />
                          <Text size="1" className="text-gray-300">{image.views}</Text>
                        </Flex>
                      </Flex>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </div>
        )}
      </Box>
    );
  }

  if (!boards) {
    return (
      <Box className="flex justify-center items-center min-h-[50vh]">
        <Text color="gray">Loading boards...</Text>
      </Box>
    );
  }

  return (
    <Box className="space-y-6 w-full">
      <Flex justify="between" align="center" className="flex-col sm:flex-row gap-4">
        <Box>
          <Text size="7" weight="bold">My Boards</Text>
          <Text size="3" color="gray" className="mt-1">
            Organize your favorite images into collections
          </Text>
        </Box>
        <Button size="3" variant="solid" onClick={() => {
          setCreateModalOpen(true);
        }}>
          <PlusIcon />
          Create Board
        </Button>
      </Flex>

      {boards.length === 0 ? (
        <Box className="text-center py-20">
          <BookmarkIcon width="48" height="48" className="mx-auto mb-4 text-gray-400" />
          <Text size="4" color="gray" className="mb-4">
            No boards yet
          </Text>
          <Text size="3" color="gray">
            Create your first board to start organizing your favorite images
          </Text>
        </Box>
      ) : (
        <Grid columns={{ initial: "1", sm: "2", lg: "3" }} gap="5">
          {boards.map((board) => (
            <Card key={board._id} className="hover:shadow-xl transition-shadow bg-gray-900/20">
              <Box className="p-5">
                <Flex justify="between" align="start" className="mb-4">
                  <Box className="flex-1">
                    <Text size="4" weight="bold" className="mb-2">
                      {board.name}
                    </Text>
                    {board.description && (
                      <Text size="2" color="gray" className="line-clamp-3">
                        {board.description}
                      </Text>
                    )}
                  </Box>
                  <Flex gap="2">
                    <IconButton
                      variant="ghost"
                      size="2"
                      onClick={() => setSelectedBoardId(board._id)}
                    >
                      <EyeOpenIcon />
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      size="2"
                      color="red"
                      onClick={() => handleDeleteBoard(board._id)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                </Flex>

                <Flex justify="between" align="center" className="mt-4">
                  <Flex gap="3" align="center">
                    <Badge variant="soft" color="gray" size="2">
                      {board.imageIds.length} images
                    </Badge>
                    {board.isPublic && (
                      <Badge variant="soft" color="blue" size="2">
                        Public
                      </Badge>
                    )}
                  </Flex>
                  <Button
                    variant="solid"
                    size="2"
                    onClick={() => setSelectedBoardId(board._id)}
                  >
                    View Board
                  </Button>
                </Flex>

                <Flex gap="2" wrap="wrap" className="mt-4">
                  <Button
                    variant="soft"
                    size="2"
                    disabled={board.imageIds.length === 0}
                    onClick={() => handleConvertToStoryboard(board._id)}
                  >
                    Convert to Storyboard
                  </Button>
                  <Button
                    variant="soft"
                    size="2"
                    disabled={board.imageIds.length === 0}
                    onClick={() => handleConvertToDeck(board._id)}
                  >
                    Convert to Deck
                  </Button>
                </Flex>
              </Box>
            </Card>
          ))}
        </Grid>
      )}

      <CreateBoardModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
        }}
        setActiveTab={setActiveTab}
        incrementBoardVersion={incrementBoardVersion}
      />
    </Box>
  );
}
