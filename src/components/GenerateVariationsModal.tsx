import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button, TextField, Text, Flex, Box, Select } from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  MODAL_CONTENT_CLASS,
  MODAL_DESCRIPTION_CLASS,
  MODAL_TITLE_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/actionStyles";

interface GenerateVariationsModalProps {
  imageId: Id<"images">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateVariationsModal({ imageId, open, onOpenChange }: GenerateVariationsModalProps) {
  const generateVariations = useMutation(api.vision.generateVariations);
  const [variationCount, setVariationCount] = useState(1);
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
      setVariationCount(1);
      setModificationMode("shot-variation");
      setVariationDetail("");
    } catch (error) {
      console.error("Failed to generate variations:", error);
      toast.error("Failed to start variation generation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${MODAL_CONTENT_CLASS} w-[min(95vw,28rem)] max-w-[28rem] p-6 text-white`}>
        <DialogTitle className={MODAL_TITLE_CLASS}>Generate Variations</DialogTitle>
        <DialogDescription className={MODAL_DESCRIPTION_CLASS}>
          Create AI-generated variations of this image.
        </DialogDescription>

        <Flex direction="column" gap="3" className="mt-4">
          <Box>
            <Text size="2" weight="medium" className={FIELD_LABEL_CLASS}>Type</Text>
            <Select.Root value={modificationMode} onValueChange={setModificationMode}>
              <Select.Trigger className={`w-full ${FIELD_CLASS}`} />
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
            <Text size="2" weight="medium" className={FIELD_LABEL_CLASS}>Aspect ratio</Text>
            <Select.Root value={aspectRatio} onValueChange={setAspectRatio}>
              <Select.Trigger className={`w-full ${FIELD_CLASS}`} />
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
            <Text size="2" weight="medium" className={FIELD_LABEL_CLASS}>Count (1–12)</Text>
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
              className={FIELD_CLASS}
            />
          </Box>
          <Box>
            <Text size="2" weight="medium" className={FIELD_LABEL_CLASS}>Detail (optional)</Text>
            <TextField.Root
              value={variationDetail}
              onChange={(e) => setVariationDetail(e.target.value)}
              placeholder="e.g., wide shot, neon mood"
              size="2"
              className={FIELD_CLASS}
            />
          </Box>
        </Flex>

        <Flex justify="end" gap="2" className="mt-4">
          <Button
            variant="soft"
            color="gray"
            className={SECONDARY_BUTTON_CLASS}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="soft"
            color="gray"
            className={PRIMARY_BUTTON_CLASS}
            onClick={() => void handleGenerate()}
          >
            <MagicWandIcon /> Generate {variationCount}
          </Button>
        </Flex>
      </DialogContent>
    </Dialog>
  );
}
