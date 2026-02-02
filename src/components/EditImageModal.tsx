import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, Button, TextField, Text, Box, Flex, Select, Badge } from "@radix-ui/themes";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { getTagColor } from "../lib/utils";

interface EditImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: Id<"images">;
}

export function EditImageModal({ open, onOpenChange, imageId }: EditImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const categories = useQuery(api.images.getCategories);
  const groups = useQuery(api.images.getGroups);
  const updateImageMetadata = useMutation(api.images.updateImageMetadata);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [group, setGroup] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [sref, setSref] = useState("");
  const [projectName, setProjectName] = useState("");
  const [moodboardName, setMoodboardName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load image data when modal opens
  useEffect(() => {
    if (open && image) {
      setTitle(image.title || "");
      setDescription(image.description || "");
      setTags(image.tags || []);
      setGroup(image.group || "");
      setCategory(image.category || "");
      setSource(image.source || "");
      setSref(image.sref || "");
      setProjectName(image.projectName || "");
      setMoodboardName(image.moodboardName || "");
      setTagInput("");
    }
  }, [open, image]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setTagInput("");
    }
  }, [open]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      await updateImageMetadata({
        imageId,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        group: group || undefined,
        category: category || undefined,
        source: source.trim() || undefined,
        sref: sref.trim() || undefined,
        projectName: projectName.trim() || undefined,
        moodboardName: moodboardName.trim() || undefined,
      });
      toast.success("Image updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update image:", error);
      toast.error(error.message || "Failed to update image");
    } finally {
      setSubmitting(false);
    }
  };

  if (!image) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content 
        className="w-full max-w-xl !rounded-none"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maxHeight: '85vh',
          overflowY: 'auto',
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
      >
        <Dialog.Title size="4" weight="bold">Edit Image</Dialog.Title>
        <Dialog.Description size="2" mb="5">
          Update image metadata, tags, and other information.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Title *
              </Text>
              <TextField.Root
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Image title"
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
                placeholder="Image description"
                size="2"
              />
            </Box>

            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Type
              </Text>
              <Select.Root 
                value={group || "none"} 
                onValueChange={(value) => setGroup(value === "none" ? "" : value)}
              >
                <Select.Trigger placeholder="Select type" size="2" />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {(groups || []).map((g) => (
                    <Select.Item key={g} value={g}>{g}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Genre
              </Text>
              <Select.Root 
                value={category || "none"} 
                onValueChange={(value) => setCategory(value === "none" ? "" : value)}
              >
                <Select.Trigger placeholder="Select genre" size="2" />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {(categories || []).map((cat) => (
                    <Select.Item key={cat} value={cat}>
                      {cat}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>

            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Tags
              </Text>
              <Flex gap="2" wrap="wrap" mb="2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="soft"
                    color={getTagColor(tag)}
                    size="2"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </Flex>
              <Flex gap="2">
                <TextField.Root
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag and press Enter"
                  size="2"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="soft"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </Flex>
            </Box>

            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Source URL
              </Text>
              <TextField.Root
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://..."
                size="2"
              />
            </Box>

            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Style Reference (Sref)
              </Text>
              <TextField.Root
                value={sref}
                onChange={(e) => setSref(e.target.value)}
                placeholder="Style reference"
                size="2"
              />
            </Box>

            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Project Name
              </Text>
              <TextField.Root
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                size="2"
              />
            </Box>

            <Box>
              <Text size="2" weight="medium" className="mb-2 block">
                Moodboard Name
              </Text>
              <TextField.Root
                value={moodboardName}
                onChange={(e) => setMoodboardName(e.target.value)}
                placeholder="Moodboard name"
                size="2"
              />
            </Box>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" variant="solid" disabled={submitting || !title.trim()}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

