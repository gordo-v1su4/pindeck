import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Card, Text, Flex, Box, Button, Badge, IconButton, Grid } from "@radix-ui/themes";
import { PlusIcon, TrashIcon, Pencil1Icon, EyeOpenIcon, BookmarkIcon } from "@radix-ui/react-icons";
import { CreateBoardModal } from "./CreateBoardModal";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function BoardsView({ setActiveTab, incrementBoardVersion }: { setActiveTab: (tab: string) => void, incrementBoardVersion: () => void }) {
  const boards = useQuery(api.boards.list);
  const deleteBoard = useMutation(api.boards.deleteBoard);
  const createStoryboard = useMutation(api.storyboards.createFromBoard);
  const createDeck = useMutation(api.decks.createFromBoard);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"collections"> | null>(null);

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
