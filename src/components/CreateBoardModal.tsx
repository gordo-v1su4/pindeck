import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, Button, TextField, Text, Box, Flex } from "@radix-ui/themes";
import { toast } from "sonner";

interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerPosition?: { x: number; y: number };
}

export function CreateBoardModal({ open, onOpenChange, triggerPosition }: CreateBoardModalProps) {
  const createBoard = useMutation(api.boards.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      toast.success("Board created successfully!");
      setName("");
      setDescription("");
      setIsPublic(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create board:", error);
      toast.error("Failed to create board");
    } finally {
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
        <Dialog.Title>Create New Board</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a new board to organize your favorite images.
        </Dialog.Description>

        <Box as="form" onSubmit={handleSubmit} className="space-y-4">
          <Box>
            <Text size="2" weight="medium" className="mb-2 block">
              Board Name *
            </Text>
            <TextField.Root
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Inspiration Board"
              required
              size="3"
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
              size="3"
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
              <Text size="2" as="label" htmlFor="isPublic">
                Make this board public
              </Text>
            </Flex>
          </Box>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Board"}
            </Button>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}
