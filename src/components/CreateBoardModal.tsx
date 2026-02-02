import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, Button, TextField, Text, Box, Flex, Badge } from "@radix-ui/themes";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { UploadIcon, Cross2Icon } from "@radix-ui/react-icons";

interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId?: Id<"images">; // Optional image to add to the board when created
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
  allowUpload?: boolean; // Whether to show image upload option
}

export function CreateBoardModal({ open, onOpenChange, imageId, setActiveTab, incrementBoardVersion, allowUpload = false }: CreateBoardModalProps) {
  const createBoard = useMutation(api.boards.create);
  const addImageToBoard = useMutation(api.boards.addImage);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const createImage = useMutation(api.images.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setIsPublic(false);
      setSubmitting(false);
      setSelectedFiles([]);
      setUploadProgress("");
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

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
          if (addError.message?.includes("already in board")) {
            toast.success(`Board "${name.trim()}" created!`);
          } else {
            console.error("Detailed error adding image to board:", addError);
            toast.success(`Board "${name.trim()}" created, but failed to add image`);
          }
        }
      } else if (selectedFiles.length > 0) {
        // Upload selected files and add to board
        setUploadProgress(`Uploading 0/${selectedFiles.length}...`);
        let uploadedCount = 0;

        for (const file of selectedFiles) {
          try {
            // Generate upload URL
            const uploadUrl = await generateUploadUrl();

            // Upload file to Convex storage
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!response.ok) throw new Error("Upload failed");

            const { storageId } = await response.json();

            // Create image record
            const newImageId = await createImage({
              title: file.name.replace(/\.[^/.]+$/, ""),
              imageUrl: "", // Will be populated by Convex
              storageId,
              tags: [],
              category: "Uncategorized",
            });

            // Add to board
            await addImageToBoard({ boardId, imageId: newImageId });

            uploadedCount++;
            setUploadProgress(`Uploading ${uploadedCount}/${selectedFiles.length}...`);
          } catch (uploadError) {
            console.error("Failed to upload file:", file.name, uploadError);
          }
        }

        toast.success(`Board "${name.trim()}" created with ${uploadedCount} images!`);
      } else {
        console.log("No imageId or files provided");
        toast.success("Board created successfully!");
      }

      console.log("Resetting form and closing modal");
      setName("");
      setDescription("");
      setIsPublic(false);
      setSelectedFiles([]);
      setUploadProgress("");
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
        className="w-full max-w-lg !rounded-none"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
      >
        <Dialog.Title size="4" weight="bold">Create New Board</Dialog.Title>
        <Dialog.Description size="2" mb="5">
          Create a new board to organize your favorite images.
        </Dialog.Description>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Image upload section - only shown when allowUpload is true and no existing imageId */}
          {allowUpload && !imageId && (
            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Add Images (optional)
              </Text>
              <Box
                className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <UploadIcon width="24" height="24" className="mx-auto mb-2 text-gray-400" />
                <Text size="2" color="gray">
                  Click to select images or drag and drop
                </Text>
              </Box>

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <Box className="mt-3">
                  <Flex gap="2" wrap="wrap">
                    {selectedFiles.map((file, index) => (
                      <Badge key={index} variant="soft" color="gray" size="1" className="pr-1">
                        <Flex align="center" gap="1">
                          <Text size="1" className="max-w-24 truncate">{file.name}</Text>
                          <Cross2Icon
                            className="cursor-pointer hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          />
                        </Flex>
                      </Badge>
                    ))}
                  </Flex>
                  <Text size="1" color="gray" className="mt-2">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </Text>
                </Box>
              )}

              {uploadProgress && (
                <Text size="2" color="blue" className="mt-2">{uploadProgress}</Text>
              )}
            </Box>
          )}

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" variant="solid" disabled={submitting || !name.trim()}>
              {submitting ? (uploadProgress || "Creating...") : "Create Board"}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
