import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Card, Text, Flex, Box, Button, Badge, IconButton, Grid } from "@radix-ui/themes";
import { PlusIcon, TrashIcon, EditIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { CreateBoardModal } from "./CreateBoardModal";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function BoardsView() {
  const boards = useQuery(api.boards.list);
  const deleteBoard = useMutation(api.boards.deleteBoard);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"collections"> | null>(null);
  const [triggerPosition, setTriggerPosition] = useState<{ x: number; y: number } | undefined>();

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

  if (!boards) {
    return (
      <Box className="flex justify-center items-center min-h-[50vh]">
        <Text color="gray">Loading boards...</Text>
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      <Flex justify="between" align="center">
        <Box>
          <Text size="6" weight="bold">My Boards</Text>
          <Text size="2" color="gray" className="mt-1">
            Organize your favorite images into collections
          </Text>
        </Box>
        <Button onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTriggerPosition({
            x: rect.left,
            y: rect.bottom + 8
          });
          setCreateModalOpen(true);
        }}>
          <PlusIcon />
          Create Board
        </Button>
      </Flex>

      {boards.length === 0 ? (
        <Box className="text-center py-16">
          <Text size="4" color="gray" className="mb-4">
            No boards yet
          </Text>
          <Text size="2" color="gray" className="mb-6">
            Create your first board to start organizing your favorite images
          </Text>
          <Button onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTriggerPosition({
              x: rect.left,
              y: rect.bottom + 8
            });
            setCreateModalOpen(true);
          }}>
            <PlusIcon />
            Create Your First Board
          </Button>
        </Box>
      ) : (
        <Grid columns={{ initial: "1", sm: "2", lg: "3" }} gap="4">
          {boards.map((board) => (
            <Card key={board._id} className="hover:shadow-lg transition-shadow">
              <Box className="p-4">
                <Flex justify="between" align="start" className="mb-3">
                  <Box className="flex-1">
                    <Text size="3" weight="bold" className="mb-1">
                      {board.name}
                    </Text>
                    {board.description && (
                      <Text size="2" color="gray" className="line-clamp-2">
                        {board.description}
                      </Text>
                    )}
                  </Box>
                  <Flex gap="1">
                    <IconButton
                      variant="ghost"
                      size="1"
                      onClick={() => setSelectedBoardId(board._id)}
                    >
                      <EyeOpenIcon />
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      size="1"
                      color="red"
                      onClick={() => handleDeleteBoard(board._id)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                </Flex>

                <Flex justify="between" align="center">
                  <Flex gap="2" align="center">
                    <Badge variant="soft" color="gray" size="1">
                      {board.imageIds.length} images
                    </Badge>
                    {board.isPublic && (
                      <Badge variant="soft" color="blue" size="1">
                        Public
                      </Badge>
                    )}
                  </Flex>
                  <Button
                    variant="soft"
                    size="1"
                    onClick={() => setSelectedBoardId(board._id)}
                  >
                    View Board
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
          if (!open) setTriggerPosition(undefined);
        }}
        triggerPosition={triggerPosition}
      />
    </Box>
  );
}
