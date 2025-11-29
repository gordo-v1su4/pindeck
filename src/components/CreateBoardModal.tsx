import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, Button, TextField, Text, Box, Flex } from "@radix-ui/themes";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerPosition?: { x: number; y: number };
  imageId?: Id<"images">; // Optional image to add to the board when created
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}

export function CreateBoardModal({ open, onOpenChange, triggerPosition, imageId, setActiveTab, incrementBoardVersion }: CreateBoardModalProps) {
  const createBoard = useMutation(api.boards.create);
  const addImageToBoard = useMutation(api.boards.addImage);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    console.log("Submitting new board...");
    setSubmitting(true);
    try {
      console.log("Calling createBoard mutation with:", { name, description, isPublic });
      const boardId = await createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      console.log("createBoard mutation successful, boardId:", boardId);
      
      // If imageId is provided, automatically add the image to the new board
      if (imageId) {
        console.log("imageId found, calling addImageToBoard mutation with:", { boardId, imageId });
        try {
          await addImageToBoard({
            boardId,
            imageId,
          });
          console.log("addImageToBoard mutation successful");
          toast.success(`Board "${name.trim()}" created and image saved!`);
        } catch (addError: any) {
          console.error("Failed to add image to board:", addError);
          // If image is already in board (shouldn't happen for new board, but handle gracefully)
          if (addError.message?.includes("already in board")) {
            toast.success(`Board "${name.trim()}" created!`);
          } else {
            console.error("Detailed error adding image to board:", addError);
            toast.success(`Board "${name.trim()}" created, but failed to add image`);
          }
        }
      } else {
        console.log("No imageId provided, skipping addImageToBoard");
        toast.success("Board created successfully!");
      }
      
      console.log("Resetting form and closing modal");
      setName("");
      setDescription("");
      setIsPublic(false);
      onOpenChange(false);
      setActiveTab("boards");
      incrementBoardVersion();
    } catch (error) {
      console.error("Failed to create board:", error);
      toast.error("Failed to create board");
    } finally {
      console.log("Submission process finished");
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
             <Dialog.Content 
               maxWidth="sm" 
               className="w-96"
               style={triggerPosition ? {
                 position: 'fixed',
                 top: `${Math.min(triggerPosition.y, window.innerHeight - 400)}px`,
                 left: `${Math.min(triggerPosition.x, window.innerWidth - 384)}px`,
                 transform: 'none'
               } : undefined}
             >
        <Dialog.Title size="4" weight="bold">Create New Board</Dialog.Title>
        <Dialog.Description size="2" mb="5">
          Create a new board to organize your favorite images.
        </Dialog.Description>

        <Box as="form" onSubmit={handleSubmit} className="space-y-5">
          <Box>
            <Text size="2" weight="medium" className="mb-2 block">
              Board Name *
            </Text>
            <TextField.Root
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Inspiration Board"
              required
              size="2"
            />
          </Box>

          <Box>
            <Text size="2" weight="medium" className="mb-2 block">
              Description
            </Text>
            <TextField.Root
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              size="2"
            />
          </Box>

          <Box>
            <Flex align="center" gap="2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <Text size="2" as="label" htmlFor="isPublic" className="cursor-pointer">
                Make this board public
              </Text>
            </Flex>
          </Box>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" variant="solid" disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Board"}
            </Button>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}
