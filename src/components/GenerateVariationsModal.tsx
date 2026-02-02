import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Dialog, Button, TextField, Text, Flex, Box, Select } from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";

interface GenerateVariationsModalProps {
  imageId: Id<"images">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateVariationsModal({ imageId, open, onOpenChange }: GenerateVariationsModalProps) {
  const generateVariations = useMutation(api.vision.generateVariations);
  const [variationCount, setVariationCount] = useState(2);
  const [modificationMode, setModificationMode] = useState("shot-variation");
  const [variationDetail, setVariationDetail] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const handleGenerate = async () => {
    if (variationCount < 1) return;
    try {
      await generateVariations({
        imageId,
        variationCount,
        modificationMode,
        variationDetail: variationDetail.trim() || undefined,
        aspectRatio: aspectRatio || undefined,
      });
      toast.success(`Generating ${variationCount} variations...`);
      onOpenChange(false);
      setVariationCount(2);
      setModificationMode("shot-variation");
      setVariationDetail("");
    } catch (error) {
      console.error("Failed to generate variations:", error);
      toast.error("Failed to start variation generation");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 420 }}>
        <Dialog.Title>Generate Variations</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Create AI-generated variations of this image.
        </Dialog.Description>

        <Flex direction="column" gap="3" className="mt-4">
          <Box>
            <Text size="2" weight="medium" className="mb-1 block">Type</Text>
            <Select.Root value={modificationMode} onValueChange={setModificationMode}>
              <Select.Trigger className="w-full" />
              <Select.Content>
                <Select.Item value="shot-variation">Shot variation</Select.Item>
                <Select.Item value="b-roll">B-Roll</Select.Item>
                <Select.Item value="action-shot">Action shot</Select.Item>
                <Select.Item value="style-variation">Style variation</Select.Item>
                <Select.Item value="subtle-variation">Subtle variation</Select.Item>
                <Select.Item value="coverage">Coverage</Select.Item>
              </Select.Content>
            </Select.Root>
          </Box>
          <Box>
            <Text size="2" weight="medium" className="mb-1 block">Aspect ratio</Text>
            <Select.Root value={aspectRatio} onValueChange={setAspectRatio}>
              <Select.Trigger className="w-full" />
              <Select.Content>
                <Select.Item value="16:9">16:9 (horizontal)</Select.Item>
                <Select.Item value="9:16">9:16 (vertical)</Select.Item>
                <Select.Item value="1:1">1:1</Select.Item>
                <Select.Item value="4:3">4:3</Select.Item>
                <Select.Item value="3:4">3:4</Select.Item>
              </Select.Content>
            </Select.Root>
          </Box>
          <Box>
            <Text size="2" weight="medium" className="mb-1 block">Count (1–12)</Text>
            <TextField.Root
              type="number"
              min={1}
              max={12}
              value={variationCount.toString()}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) setVariationCount(Math.min(Math.max(val, 1), 12));
              }}
              size="2"
            />
          </Box>
          <Box>
            <Text size="2" weight="medium" className="mb-1 block">Detail (optional)</Text>
            <TextField.Root
              value={variationDetail}
              onChange={(e) => setVariationDetail(e.target.value)}
              placeholder="e.g., wide shot, neon mood"
              size="2"
            />
          </Box>
        </Flex>

        <Flex justify="end" gap="2" className="mt-4">
          <Button variant="soft" color="gray" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button color="teal" onClick={() => void handleGenerate()}>
            <MagicWandIcon /> Generate {variationCount}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
