import { useState, type CSSProperties } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button, TextField, Text, Flex, Box } from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const VARIATION_MODES: { id: string; label: string }[] = [
  { id: "shot-variation", label: "Shot Variation" },
  { id: "b-roll", label: "B-Roll" },
  { id: "action-shot", label: "Action Shot" },
  { id: "style-variation", label: "Style Variation" },
  { id: "subtle-variation", label: "Subtle Variation" },
  { id: "coverage", label: "Coverage" },
];

const SHOT_CHIP_PRESETS: { label: string; detail: string }[] = [
  { label: "None", detail: "" },
  { label: "Variation", detail: "variation" },
  { label: "Close-up", detail: "close-up" },
  { label: "Medium", detail: "medium shot" },
  { label: "Wide", detail: "wide shot" },
  { label: "Extreme wide", detail: "extreme wide shot" },
  { label: "Dutch", detail: "dutch angle" },
  { label: "OTS", detail: "over-the-shoulder" },
  { label: "Low angle", detail: "low angle shot" },
  { label: "Bird's eye", detail: "bird's eye view" },
];

const ASPECT_OPTIONS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const COUNT_OPTIONS = [1, 4, 8, 12];

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
  const modeTitle = VARIATION_MODES.find((mode) => mode.id === modificationMode)?.label ?? "Variation";
  const chipBase: CSSProperties = {
    padding: "5px 8px",
    borderRadius: 4,
    fontSize: 11,
    border: "0",
    outline: "none",
    background: "rgba(255,255,255,0.025)",
    color: "var(--pd-ink-dim)",
    cursor: "pointer",
  };
  const chipSelected: CSSProperties = {
    ...chipBase,
    background: "var(--pd-accent-soft)",
    color: "var(--pd-accent-ink)",
  };

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
      <DialogContent className="w-[min(95vw,32.5rem)] max-w-[32.5rem] !gap-0 !p-0 text-white">
        <Box className="pd-glass-header px-5 py-4">
          <DialogTitle className="m-0 text-[15px] font-semibold leading-tight text-[var(--pd-ink)]">
            Generate Variations
          </DialogTitle>
          <DialogDescription className="mt-2 text-[13px] leading-5 text-[var(--pd-ink-mute)]">
            Create AI-generated variations of this image.
          </DialogDescription>
        </Box>

        <Flex direction="column" gap="4" className="pd-glass-body px-5 py-4">
          <Box style={{ background: "transparent", border: 0, borderRadius: 0, padding: 0 }}>
            <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">Mode</Text>
            <Box className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VARIATION_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setModificationMode(mode.id)}
                  style={modificationMode === mode.id ? chipSelected : chipBase}
                >
                  {mode.label}
                </button>
              ))}
            </Box>
          </Box>

          <Box>
            <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">Shot type</Text>
            <Flex gap="2" wrap="wrap">
              {SHOT_CHIP_PRESETS.map((shot) => (
                <button
                  key={shot.label}
                  type="button"
                  onClick={() => setVariationDetail(shot.detail)}
                  style={variationDetail.trim().toLowerCase() === shot.detail.toLowerCase() ? chipSelected : chipBase}
                >
                  {shot.label}
                </button>
              ))}
            </Flex>
          </Box>

          <Box>
            <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">Aspect</Text>
            <Flex gap="2" wrap="wrap">
              {ASPECT_OPTIONS.map((aspect) => (
                <button
                  key={aspect}
                  type="button"
                  onClick={() => setAspectRatio(aspect)}
                  style={aspectRatio === aspect ? chipSelected : chipBase}
                >
                  {aspect}
                </button>
              ))}
            </Flex>
          </Box>

          <Box>
            <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">Count</Text>
            <Flex gap="2" wrap="wrap">
              {COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setVariationCount(count)}
                  style={variationCount === count ? chipSelected : chipBase}
                >
                  {count}
                </button>
              ))}
            </Flex>
          </Box>

          <Box>
            <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">Custom detail (optional)</Text>
            <TextField.Root
              value={variationDetail}
              onChange={(e) => setVariationDetail(e.target.value)}
              placeholder="Refines prompts for this generation run"
              size="2"
            />
          </Box>
        </Flex>

        <Flex justify="end" gap="2" className="pd-glass-footer px-5 py-4">
          <Button variant="soft" color="gray" className="pd-action-secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="soft" className="pd-action-primary" onClick={() => void handleGenerate()}>
            <MagicWandIcon /> Generate {variationCount} {modeTitle}
          </Button>
        </Flex>
      </DialogContent>
    </Dialog>
  );
}
