import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  compactImageTagClass,
  getPaletteTagStyle,
  getPaletteSwatchStyle,
  sortColorsDarkToLight,
} from "../lib/utils";
import { extractColorsFromImage } from "../lib/colorExtraction";
import {
  Card,
  Text,
  Flex,
  Box,
  Button,
  TextField,
  Select,
  Badge,
  IconButton,
  Grid,
  Heading,
  Separator,
  Dialog
} from "@radix-ui/themes";
import {
  UploadIcon,
  Cross2Icon,
  ImageIcon,
  TrashIcon,
  CheckIcon,
  MagicWandIcon,
  MagnifyingGlassIcon
} from "@radix-ui/react-icons";
import { toast } from "sonner";

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  source: string;
  sref: string;
  colors: string[];
  group?: string;
  genre?: string;
  style?: string;
  shot?: string;
  projectName?: string;
  moodboardName?: string;
  uniqueId?: string;
  colorStatus?: "pending" | "ready" | "failed";
  metadataStatus?: "pending" | "ready" | "failed";
  metadataError?: string;
}

const ANALYSIS_IMAGE_MAX_DIMENSION = 1024;
const ANALYSIS_IMAGE_MAX_DATA_URL_BYTES = 4 * 1024 * 1024;
const ANALYSIS_UPLOAD_CONCURRENCY = 2;

function fileToAnalysisDataUrl(previewUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(
        1,
        ANALYSIS_IMAGE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare image for metadata analysis."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);

      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= ANALYSIS_IMAGE_MAX_DATA_URL_BYTES || quality === 0.52) {
          resolve(dataUrl);
          return;
        }
      }
    };
    image.onerror = () => reject(new Error("Could not prepare image for metadata analysis."));
    image.src = previewUrl;
  });
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function createUploadUniqueId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

const ASPECT_OPTIONS: { label: string; value: string }[] = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
];

const COUNT_OPTIONS = [1, 4, 8, 12];

export function ImageUploadForm() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadMultiple = useMutation(api.images.uploadMultiple);
  const categories = useQuery(api.images.getCategories);
  const groups = useQuery(api.images.getGroups);
  const remove = useMutation(api.images.remove); // Make sure 'remove' is defined

  // Pending Images Logic
  const pendingImages = useQuery(api.images.getPendingImages);
  const processingImages = useQuery(api.images.getProcessingImages);
  const draftImages = useQuery(api.images.getDraftImages);
  const approveImage = useMutation(api.images.approveImage);
  const rejectImage = useMutation(api.images.rejectImage);
  const finalizeUploads = useMutation(api.images.finalizeUploads);
  const updateImageMetadataMutation = useMutation(api.images.updateImageMetadata);
  const rerunSmartAnalysisMutation = useMutation(api.vision.rerunSmartAnalysis);
  const generateVariationsMutation = useMutation(api.vision.generateVariations);
  const previewUploadMetadata = useAction((api as any).vision.previewUploadMetadata);
  const setAiStatusMutation = useMutation(api.images.setAiStatus);
  const clearMyStaleProcessingImagesMutation = useMutation(api.images.clearMyStaleProcessingImages);

  const localPendingImages = (pendingImages || []).filter((img) => img.sourceType !== "discord");
  const discordPendingImages = (pendingImages || []).filter((img) => img.sourceType === "discord");
  const localDraftImages = draftImages || [];
  const supportingGroups = (groups || []).filter((group) => group.toLowerCase() !== "film");
  const discordDraftImages = (draftImages || []).filter((img) => img.sourceType === "discord");
  const discordProcessingImages = (processingImages || []).filter((img) => img.sourceType === "discord");
  const discordQueueLoaded =
    loggedInUser !== undefined &&
    pendingImages !== undefined &&
    processingImages !== undefined &&
    draftImages !== undefined;

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<
    "local" | "discord" | "pinterest" | "automation"
  >("local");
  
  // Discord queue image preview (click to enlarge)
  const [discordPreviewImageId, setDiscordPreviewImageId] = useState<Id<"images"> | null>(null);
  const discordPreviewImage = discordPendingImages.find((img) => img._id === discordPreviewImageId) ?? null;

  // Post-upload variation modal state
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationTargetImageIds, setVariationTargetImageIds] = useState<Id<"images">[]>([]);
  const [variationCount, setVariationCount] = useState(1);
  const [modificationMode, setModificationMode] = useState("shot-variation");
  const [variationDetail, setVariationDetail] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const hasPendingColorSampling = files.some((file) => file.colorStatus === "pending");
  const hasPendingMetadataAnalysis = files.some((file) => file.metadataStatus === "pending");

  useEffect(() => {
    void clearMyStaleProcessingImagesMutation({ olderThanHours: 18 }).catch((error) => {
      console.warn("Failed to clear stale processing images", error);
    });
  }, [clearMyStaleProcessingImagesMutation]);

  // Loading state check
  if (categories === undefined) {
    return (
      <Box className="flex items-center justify-center min-h-[50vh]">
        <Text size="3" color="gray">Loading...</Text>
      </Box>
    );
  }

  // Function to update metadata for images in draft state
  const updateImageMetadata = async (
    imageId: Id<"images">,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      category?: string;
      source?: string;
      sref?: string;
      colors?: string[];
      group?: string;
      genre?: string;
      style?: string;
      shot?: string;
      projectName?: string;
      moodboardName?: string;
      uniqueId?: string;
    }
  ) => {
    try {
      await updateImageMetadataMutation({ imageId, ...updates });
    } catch (error) {
      console.error("Failed to update image metadata:", error);
      toast.error("Failed to update image metadata.");
    }
  };

  const handleFiles = async (newFiles: FileList | File[]) => {
    console.log("handleFiles called with", newFiles.length, "files");
    const fileArray = Array.from(newFiles);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    console.log("Filtered to", imageFiles.length, "image files");
    
    if (imageFiles.length === 0) {
      toast.error("Please select image files only");
      return;
    }

    // Create initial objects
    const defaultCategory = categories && categories.length > 0 ? categories[0] : "General";
    const newUploadFiles: UploadFile[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      title: "",
      description: "",
      tags: [],
      category: defaultCategory,
      source: "",
      sref: "",
      colors: [],
      group: undefined,
      projectName: undefined,
      moodboardName: undefined,
      uniqueId: createUploadUniqueId(),
      colorStatus: "pending",
      metadataStatus: "pending",
    }));

    setFiles(prev => [...prev, ...newUploadFiles]);

    void Promise.all(
      newUploadFiles.map(async (uploadFile) => {
        const colors = await extractColorsFromImage(uploadFile.preview);
        setFiles(prev => prev.map((file) => {
          if (file.id !== uploadFile.id) return file;
          return {
            ...file,
            colors,
            colorStatus: colors.length > 0 ? "ready" : "failed",
          };
        }));
      })
    );

    void runWithConcurrency(newUploadFiles, ANALYSIS_UPLOAD_CONCURRENCY, async (uploadFile) => {
      try {
        const imageDataUrl = await fileToAnalysisDataUrl(uploadFile.preview);
        const metadata = await previewUploadMetadata({
          imageDataUrl,
          fileName: uploadFile.file.name,
          description: uploadFile.description || undefined,
        });
        setFiles(prev => prev.map((file) => {
          if (file.id !== uploadFile.id) return file;
          const resolvedTitle = file.title || metadata.title || uploadFile.file.name;
          return {
            ...file,
            title: resolvedTitle,
            description: file.description || metadata.description || file.description,
            tags: file.tags.length ? file.tags : metadata.tags || [],
            category: metadata.category || file.category,
            colors: file.colors.length ? file.colors : metadata.colors || [],
            group: file.group || metadata.group || undefined,
            genre: file.genre || metadata.genre || undefined,
            style: file.style || metadata.style || undefined,
            shot: file.shot || metadata.shot || undefined,
            projectName: file.projectName || metadata.projectName || resolvedTitle,
            moodboardName: file.moodboardName || metadata.moodboardName || undefined,
            uniqueId: file.uniqueId || metadata.uniqueId || createUploadUniqueId(),
            metadataStatus: "ready",
            metadataError: undefined,
          };
        }));
      } catch (error) {
        console.error("Pre-upload metadata analysis failed:", error);
        setFiles(prev => prev.map((file) => {
          if (file.id !== uploadFile.id) return file;
          return {
            ...file,
            metadataStatus: "failed",
            metadataError: error instanceof Error ? error.message : "AI metadata failed.",
          };
        }));
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    console.log("handleDrop called", e.dataTransfer.files?.length);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileInput called", e.target.files?.length);
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
      // Reset input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addTag = (fileId: string, tag: string) => {
    if (!tag.trim()) return;
    const trimmedTag = tag.trim().toLowerCase();
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, tags: [...f.tags.filter(t => t !== trimmedTag), trimmedTag] }
        : f
    ));
  };

  const removeTag = (fileId: string, tag: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, tags: f.tags.filter(t => t !== tag) }
        : f
    ));
  };

  const addTagToDraft = async (imageId: Id<"images">, tag: string) => {
    if (!tag.trim()) return;
    const trimmedTag = tag.trim().toLowerCase();
    const image = draftImages?.find(img => img._id === imageId);
    if (image) {
      const updatedTags = [...new Set([...image.tags, trimmedTag])];
      await updateImageMetadata(imageId, { tags: updatedTags });
    }
  };

  const removeTagFromDraft = async (imageId: Id<"images">, tag: string) => {
    const image = draftImages?.find(img => img._id === imageId);
    if (image) {
      const updatedTags = image.tags.filter(t => t !== tag);
      await updateImageMetadata(imageId, { tags: updatedTags });
    }
  };

  const reRunAnalysis = async (
    imageId: Id<"images">,
    storageId: Id<"_storage"> | undefined,
    imageUrl: string | undefined,
    title: string,
    description?: string,
    tags?: string[],
    category?: string,
    source?: string,
    sref?: string,
    variationCount?: number,
    modificationMode?: string
  ) => {
    try {
      toast.info("Re-running AI analysis...");
      await rerunSmartAnalysisMutation({
        imageId,
        storageId,
        imageUrl,
        title,
        description,
        tags: tags || [],
        category: category || "general",
        source,
        sref,
        variationCount,
        modificationMode,
      });
    } catch (error) {
      console.error("Failed to re-run analysis:", error);
      toast.error("Failed to re-run AI analysis.");
    }
  };

  const handleFinalizeUploads = async () => {
    if (localDraftImages.length === 0) return;

    try {
      const imageIdsToFinalize = localDraftImages.map(img => img._id);
      await finalizeUploads({ imageIds: imageIdsToFinalize });
      toast.success(`${imageIdsToFinalize.length} image(s) finalized and added to gallery!`);
    } catch (error) {
      console.error("Finalize uploads failed:", error);
      toast.error("Failed to finalize uploads.");
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one image");
      return;
    }
    if (hasPendingColorSampling) {
      toast.info("Still sampling image colors. Upload will be ready in a moment.");
      return;
    }
    if (hasPendingMetadataAnalysis) {
      toast.info("Still generating metadata. Upload will be ready in a moment.");
      return;
    }

    setUploading(true);
    try {
      // Upload files to storage - NO variation generation at upload time
      const uploadPromises = files.map(async (file) => {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.file.type },
          body: file.file,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.file.name}`);
        }

        const { storageId } = await response.json();

        const generatedTitle = file.title || file.projectName || file.file.name;
        const projectName = file.projectName || generatedTitle;
        const uniqueId = file.uniqueId || createUploadUniqueId();

        return {
          storageId,
          originalFileName: file.file.name,
          title: generatedTitle,
          description: file.description || undefined,
          tags: file.tags,
          category: file.category,
          source: file.source || undefined,
          sref: file.sref || undefined,
          colors: file.colors,
          group: file.group || undefined,
          genre: file.genre || undefined,
          style: file.style || undefined,
          shot: file.shot || undefined,
          projectName,
          moodboardName: file.moodboardName || undefined,
          uniqueId: uniqueId,
          // Uploads should not silently auto-generate variations.
          variationCount: 0,
        };
      });

      const uploads = await Promise.all(uploadPromises);

      const imageIds = await uploadMultiple({ uploads });

      // Clear local files after successful initial upload and scheduling
      files.forEach(file => URL.revokeObjectURL(file.preview));
      setFiles([]);
      toast.info("Upload queued. Analyzing metadata and sampled colors...");

      if (imageIds.length > 0) {
        setVariationTargetImageIds(imageIds);
        setVariationModalOpen(true);
      }

    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (imageId: Id<"images">) => {
    try {
      await approveImage({ imageId });
      toast.success("Image approved and added to your review queue!");
    } catch (error) {
      console.error("Failed to approve image:", error);
      toast.error("Failed to approve image.");
    }
  };

  const handleReject = async (imageId: Id<"images">) => {
    try {
      // Check if it's a pending image (suggestion) or a draft image
      const isPending = pendingImages?.some(img => img._id === imageId);
      const isDraft = draftImages?.some(img => img._id === imageId);

      if (isPending) {
        await rejectImage({ imageId }); // This deletes the image and its storage
        toast.success("Generated suggestion discarded!");
      } else if (isDraft) {
        await remove({ id: imageId }); // This deletes the image and its storage
        toast.success("Draft image discarded!");
      } else {
        console.warn("Attempted to reject/remove an image not found in pending or draft lists.", imageId);
        toast.error("Could not find image to discard.");
      }
    } catch (error) {
      console.error("Failed to discard image:", error);
      toast.error("Failed to discard image.");
    }
  };

  // Handle generating variations for a specific image
  const handleGenerateVariations = async () => {
    if (variationTargetImageIds.length === 0 || variationCount < 1) return;

    try {
      await Promise.all(
        variationTargetImageIds.map((imageId) =>
          generateVariationsMutation({
            imageId,
            variationCount,
            modificationMode,
            variationDetail: variationDetail.trim() || undefined,
            aspectRatio: aspectRatio || undefined,
          })
        )
      );
      toast.success(
        `Generating ${variationCount} variation${variationCount !== 1 ? "s" : ""} for ${variationTargetImageIds.length} image${variationTargetImageIds.length !== 1 ? "s" : ""}...`
      );
      setVariationModalOpen(false);
      setVariationTargetImageIds([]);
      setVariationCount(1);
      setModificationMode("shot-variation");
      setVariationDetail("");
      setAspectRatio("16:9");
    } catch (error) {
      console.error("Failed to generate variations:", error);
      toast.error("Failed to start variation generation");
    }
  };

  // Open the variation modal for a specific image
  const openVariationModal = (imageId: Id<"images">) => {
    setVariationTargetImageIds([imageId]);
    setVariationModalOpen(true);
  };

  const modeTitle = VARIATION_MODES.find((mode) => mode.id === modificationMode)?.label ?? "Variation";
  const chipBase: React.CSSProperties = {
    padding: "5px 8px",
    borderRadius: 4,
    fontSize: 11,
    border: "0",
    outline: "none",
    background: "rgba(255,255,255,0.025)",
    color: "var(--pd-ink-dim)",
    cursor: "pointer",
  };
  const chipSelected: React.CSSProperties = {
    ...chipBase,
    background: "var(--pd-accent-soft)",
    color: "var(--pd-accent-ink)",
  };

  return (
    <Box className="space-y-7 max-w-4xl mx-auto w-full font-[var(--pd-font-sans)]">
      <Flex gap="2" wrap="wrap" className="pt-2">
        <Button
          variant="soft"
          className="pd-action-tab"
          data-active={activeUploadTab === "local"}
          onClick={() => setActiveUploadTab("local")}
        >
          Local Upload
        </Button>
        <Button
          variant="soft"
          className="pd-action-tab"
          data-active={activeUploadTab === "discord"}
          onClick={() => setActiveUploadTab("discord")}
        >
          Discord
        </Button>
        <Button
          variant="soft"
          className="pd-action-tab"
          data-active={activeUploadTab === "pinterest"}
          onClick={() => setActiveUploadTab("pinterest")}
        >
          Pinterest
        </Button>
        <Button
          variant="soft"
          className="pd-action-tab"
          data-active={activeUploadTab === "automation"}
          onClick={() => setActiveUploadTab("automation")}
        >
          Automation
        </Button>
      </Flex>

      {activeUploadTab !== "local" ? (
        <>
          <Card className="p-6">
            <Heading size="5" className="mb-2">
              {activeUploadTab === "discord" && "Discord Ingest"}
              {activeUploadTab === "pinterest" && "Pinterest Import"}
              {activeUploadTab === "automation" && "Automation"}
            </Heading>
            {activeUploadTab === "discord" && (
              <Text size="2" color="gray">
                React with the configured emoji to queue RSS/Discord images. Review queued items below and keep or discard before they hit your main library.
              </Text>
            )}
            {activeUploadTab === "pinterest" && (
              <Text size="2" color="gray">
                Paste a public Pinterest board URL to import new pins into your
                gallery. We only import content you explicitly request.
              </Text>
            )}
            {activeUploadTab === "automation" && (
              <Text size="2" color="gray">
                Automation is coming soon. We'll add scheduled imports and board
                triggers here once they’re ready.
              </Text>
            )}
          </Card>

          {activeUploadTab === "discord" && (
            <Box className="mt-6 animate-in fade-in">
              <Separator size="4" className="mb-6" />
              <Card className="p-4 mb-4">
                <Flex align="start" justify="between" gap="3" wrap="wrap">
                  <Box>
                    <Heading size="3" className="mb-1">Queue Diagnostics</Heading>
                    <Text size="2" color="gray" className="block">
                      Signed-in queue owner:{" "}
                      {loggedInUser === undefined
                        ? "Loading…"
                        : loggedInUser
                          ? (loggedInUser.email || loggedInUser.name || "Authenticated user")
                          : "Not signed in"}
                    </Text>
                    <Text size="2" color="gray" className="block">
                      User ID: {loggedInUser?._id ?? "Unavailable"}
                    </Text>
                    <Text size="2" color="gray" className="block">
                      Queue query: {discordQueueLoaded ? "Loaded" : "Loading…"}
                    </Text>
                  </Box>
                  <Flex gap="2" wrap="wrap">
                    <Badge color="gray" variant="soft">
                      Pending {discordPendingImages.length}
                    </Badge>
                    <Badge color="amber" variant="soft">
                      Processing {discordProcessingImages.length}
                    </Badge>
                    <Badge color="green" variant="soft">
                      Draft {discordDraftImages.length}
                    </Badge>
                  </Flex>
                </Flex>
                <Text size="2" color="gray" className="block mt-3">
                  The Discord bot imports into its configured <code>PINDECK_USER_ID</code>. If that bot-side user ID differs from the signed-in user shown here, this queue will stay empty even when ingest succeeds.
                </Text>
              </Card>
              <Flex align="center" gap="2" className="mb-4">
                <ImageIcon width="20" height="20" style={{ color: "var(--pd-green)" }} />
                <Box>
                  <Heading size="4">Discord Queue</Heading>
                  <Text size="2" color="gray">
                    {discordPendingImages.length} queued import{discordPendingImages.length !== 1 ? "s" : ""}.
                  </Text>
                </Box>
              </Flex>

              {discordPendingImages.length === 0 ? (
                <Card className="p-4">
                  <Text size="2" color="gray">
                    No queued Discord imports yet. React to an RSS/Discord post with your ingest emoji to queue it here.
                  </Text>
                </Card>
              ) : (
                <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
                  {discordPendingImages.map((image) => (
                    <Card key={image._id} className="overflow-hidden p-0 group relative">
                      <Box
                        className="relative aspect-video cursor-pointer"
                        onClick={() => setDiscordPreviewImageId(image._id)}
                      >
                        <img
                          src={image.previewUrl || image.imageUrl}
                          alt={image.title}
                          className="w-full h-full object-cover"
                        />
                        <Box className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            color="green"
                            variant="solid"
                            size="1"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleApprove(image._id);
                            }}
                            className="flex-1 shadow-lg bg-green-500/90 hover:bg-green-500 cursor-pointer"
                          >
                            <CheckIcon /> Keep
                          </Button>
                          <Button
                            color="red"
                            variant="solid"
                            size="1"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleReject(image._id);
                            }}
                            className="flex-1 shadow-lg bg-red-500/90 hover:bg-red-500 cursor-pointer"
                          >
                            <Cross2Icon /> Discard
                          </Button>
                        </Box>
                      </Box>
                      <Box className="p-2 bg-gray-50 dark:bg-gray-900/50">
                        <Text weight="medium" size="1" className="block truncate">{(image as any).title}</Text>
                        <Text size="1" color="gray" className="line-clamp-1 text-[10px]">{(image as any).description}</Text>
                      </Box>
                    </Card>
                  ))}
                </Grid>
              )}

              {(discordProcessingImages.length > 0 || discordDraftImages.length > 0) && (
                <Card className="p-4 mt-4">
                  <Flex align="center" justify="between" gap="3" wrap="wrap">
                    <Box>
                      <Text size="2" weight="medium">
                        Approved Discord items moved out of queue
                      </Text>
                      <Text size="2" color="gray">
                        {discordProcessingImages.length} processing, {discordDraftImages.length} ready for review/finalize.
                      </Text>
                    </Box>
                    <Button size="1" variant="soft" onClick={() => setActiveUploadTab("local")}>
                      Open Local Review
                    </Button>
                  </Flex>
                </Card>
              )}

              {/* Discord queue image preview modal (click thumbnail to enlarge) */}
              <Dialog.Root
                open={!!discordPreviewImage}
                onOpenChange={(open) => { if (!open) setDiscordPreviewImageId(null); }}
              >
                <Dialog.Content
                  className="pd-glass-dialog max-h-[90vh] w-max max-w-[90vw] overflow-hidden !p-0"
                  style={{ maxWidth: "min(900px, 90vw)" }}
                >
                  <Dialog.Title className="sr-only">Preview queued image</Dialog.Title>
                  <Dialog.Description className="sr-only">Enlarged preview of queued Discord import</Dialog.Description>
                  {discordPreviewImage && (
                    <Box className="flex flex-col">
                      <Box className="pd-glass-body relative flex items-center justify-center p-2">
                        <img
                          src={discordPreviewImage.previewUrl || discordPreviewImage.imageUrl}
                          alt={discordPreviewImage.title}
                          className="max-h-[75vh] w-auto object-contain"
                          style={{ maxWidth: "min(860px, 88vw)" }}
                        />
                      </Box>
                      <Box className="pd-glass-footer p-3">
                        <Text weight="medium" size="2" className="block">{(discordPreviewImage as any).title}</Text>
                        <Text size="2" color="gray" className="block mt-1 line-clamp-2">{(discordPreviewImage as any).description}</Text>
                      </Box>
                    </Box>
                  )}
                </Dialog.Content>
              </Dialog.Root>
            </Box>
          )}
        </>
      ) : (
        <>
          {/* Generate Variations Modal - shown AFTER image is uploaded and analyzed */}
          <Dialog.Root open={variationModalOpen} onOpenChange={(open) => {
            setVariationModalOpen(open);
            if (!open) setVariationTargetImageIds([]);
          }}>
            <Dialog.Content className="pd-glass-dialog !max-w-[min(95vw,32.5rem)] !p-0">
              <Box className="pd-glass-header px-5 py-4">
                <Dialog.Title className="m-0 text-[15px] font-semibold leading-tight text-[var(--pd-ink)]">
                  Generate Variations
                </Dialog.Title>
                <Dialog.Description size="2" className="mt-2 text-[var(--pd-ink-mute)]">
                  Create AI-generated variations for {variationTargetImageIds.length === 1 ? "this image" : `${variationTargetImageIds.length} uploaded images`}. Choose what kind of variations you want before anything gets generated.
                </Dialog.Description>
              </Box>

              <Box className="pd-glass-body px-5 py-4">
                <Flex direction="column" gap="4">
                  <Box
                    style={{
                      background: "transparent",
                      border: 0,
                      borderRadius: 0,
                      padding: 0,
                    }}
                  >
                    <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">
                      Mode
                    </Text>
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
                    <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">
                      Shot type
                    </Text>
                    <Flex gap="2" wrap="wrap">
                      {SHOT_CHIP_PRESETS.map((shot) => {
                        const selected = variationDetail.trim().toLowerCase() === shot.detail.toLowerCase();
                        return (
                          <button
                            key={shot.label}
                            type="button"
                            onClick={() => setVariationDetail(shot.detail)}
                            style={selected ? chipSelected : chipBase}
                          >
                            {shot.label}
                          </button>
                        );
                      })}
                    </Flex>
                  </Box>

                  <Box>
                    <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">
                      Aspect
                    </Text>
                    <Flex gap="2" wrap="wrap">
                      {ASPECT_OPTIONS.map((aspect) => (
                        <button
                          key={aspect.label}
                          type="button"
                          onClick={() => setAspectRatio(aspect.value)}
                          style={aspectRatio === aspect.value ? chipSelected : chipBase}
                        >
                          {aspect.label}
                        </button>
                      ))}
                    </Flex>
                  </Box>

                  <Box>
                    <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">
                      Count
                    </Text>
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
                    <Text size="1" className="pd-mono mb-2 block uppercase tracking-[0.08em] text-[var(--pd-ink-faint)]">
                      Custom detail (optional)
                    </Text>
                    <TextField.Root
                      value={variationDetail}
                      onChange={(e) => setVariationDetail(e.target.value)}
                      placeholder="Refines prompts for this generation run"
                      size="2"
                    />
                    <Text size="1" className="mt-1 text-[var(--pd-ink-faint)]">
                      None is the default; add a shot type only when you want to steer framing.
                    </Text>
                  </Box>
                </Flex>
              </Box>

              <Flex justify="end" gap="3" className="pd-glass-footer px-5 py-4">
                <Button
                  variant="soft"
                  color="gray"
                  className="pd-action-secondary"
                  onClick={() => setVariationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="soft"
                  className="pd-action-primary"
                  onClick={() => void handleGenerateVariations()}
                >
                  <MagicWandIcon /> Generate {variationCount} {modeTitle}
                </Button>
              </Flex>
            </Dialog.Content>
      </Dialog.Root>

      <Box>
        <Heading size="6" weight="bold">Upload Images</Heading>
        <Text size="2" color="gray" className="mt-1">
          Upload images to your collection. Leave details blank to let AI generate them.
        </Text>
      </Box>

      {/* Refined Drop Zone */}
      <Box
        className={`
          relative overflow-hidden transition-all duration-200 ease-in-out border border-gray-6
          ${dragActive
            ? 'ring-2 ring-[color-mix(in_srgb,var(--pd-green)_38%,transparent)] ring-offset-2 ring-offset-black'
            : 'bg-gray-2 hover:bg-gray-3'
          }
        `}
        style={{
          minHeight: '150px',
          background: dragActive ? "rgba(46,230,166,0.055)" : undefined,
        }}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onChange={handleFileInput}
        />
        <Flex direction="column" align="center" justify="center" className="h-full py-6 px-4 text-center pointer-events-none">
          <Box className="bg-gray-4 p-3 shadow-sm mb-3">
            <UploadIcon width="24" height="24" className="text-gray-11" />
          </Box>
          <Text size="3" weight="medium" className="mb-1 text-gray-11">
            Click to upload or drag and drop
          </Text>
          <Text size="1" color="gray" className="max-w-xs">
            SVG, PNG, JPG or GIF (max. 10MB per file). Multiple files supported.
          </Text>
        </Flex>
      </Box>

      {/* File List */}
      {files.length > 0 && (
        <Box className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <Flex justify="between" align="center">
            <Text size="2" weight="medium">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </Text>
            <Button
              variant="ghost"
              color="red"
              size="1"
              onClick={() => {
                files.forEach(file => URL.revokeObjectURL(file.preview));
                setFiles([]);
              }}
            >
              <TrashIcon />
              Clear All
            </Button>
          </Flex>

          <Grid columns={{ initial: "1", lg: "2" }} gap="4">
            {files.map((file) => (
              <Card key={file.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <Flex gap="4">
                  <Box className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img
                      src={file.preview}
                      alt={file.title}
                      className="w-full h-full object-cover"
                    />
                  </Box>

                  <Box className="flex-1 space-y-2 min-w-0">
                    <Flex justify="between" align="start" gap="2">
                      <Box className="flex-1">
                        <TextField.Root
                          value={file.title}
                          onChange={(e) => updateFile(file.id, { title: e.target.value })}
                          placeholder="Title (Leave blank for AI)"
                          size="1"
                        >
                          <TextField.Slot>
                            <MagicWandIcon style={{ color: "var(--pd-green)" }} />
                          </TextField.Slot>
                        </TextField.Root>
                      </Box>
                      <IconButton
                        variant="ghost"
                        color="red"
                        size="1"
                        onClick={() => removeFile(file.id)}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>

                    <TextField.Root
                      value={file.description}
                      onChange={(e) => updateFile(file.id, { description: e.target.value })}
                      placeholder="Description (Leave blank for AI)"
                      size="1"
                    />
                    
                    <Flex gap="2" align="center">
                      <Select.Root
                        value={file.category}
                        onValueChange={(value) => updateFile(file.id, { category: value })}
                      >
                        <Select.Trigger size="1" placeholder="Select category" />
                        <Select.Content>
                          {(categories || []).map((category) => (
                            <Select.Item key={category} value={category}>
                              {category}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Flex>

                    {/* Type (Group) Selection */}
                    <Select.Root
                      value={file.group ? file.group : "none"}
                      onValueChange={(value) => updateFile(file.id, { group: value === "none" ? undefined : value })}
                    >
                      <Select.Trigger size="1" placeholder="Supporting type" />
                      <Select.Content>
                        <Select.Item value="none">None</Select.Item>
                        {supportingGroups.map((g) => (
                          <Select.Item key={g} value={g}>{g}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    {/* Project Name */}
                    <TextField.Root
                      value={file.projectName || ""}
                      onChange={(e) => updateFile(file.id, { projectName: e.target.value || undefined })}
                      placeholder="Project Name"
                      size="1"
                    />

                    {/* Unique ID */}
                    <TextField.Root
                      value={file.uniqueId || ""}
                      onChange={(e) => updateFile(file.id, { uniqueId: e.target.value || undefined })}
                      placeholder="Unique ID"
                      size="1"
                    />

                    <Flex gap="2">
                      <TextField.Root
                        value={file.sref}
                        onChange={(e) => updateFile(file.id, { sref: e.target.value })}
                        placeholder="Style Ref (sref)"
                        size="1"
                        className="flex-1"
                      />
                      <TextField.Root
                        value={file.source}
                        onChange={(e) => updateFile(file.id, { source: e.target.value })}
                        placeholder="Source URL/Origin"
                        size="1"
                        className="flex-1"
                      />
                    </Flex>

                    <Box>
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {sortColorsDarkToLight(file.colors || []).map((color) => (
                          <Box
                            key={color}
                            className="w-4 h-4 rounded-[3px] border"
                            style={getPaletteSwatchStyle(color)}
                            title={color}
                          />
                        ))}
                        {file.colorStatus === "pending" && (
                          <Flex align="center" gap="1">
                            <Box className="w-3 h-3 border-2 border-[var(--pd-green)] border-t-transparent rounded-full animate-spin" />
                            <Text size="1" color="gray">Sampling colors...</Text>
                          </Flex>
                        )}
                      </Flex>

                      <Flex align="center" gap="2" className="mb-2 min-h-5">
                        {file.metadataStatus === "pending" && (
                          <>
                            <Box className="w-3 h-3 border-2 border-[var(--pd-accent)] border-t-transparent rounded-full animate-spin" />
                            <Text size="1" color="gray">Generating metadata before upload...</Text>
                          </>
                        )}
                        {file.metadataStatus === "ready" && (
                          <>
                            <CheckIcon color="var(--pd-green)" />
                            <Text size="1" color="gray">Metadata ready</Text>
                          </>
                        )}
                        {file.metadataStatus === "failed" && (
                          <>
                            <Badge color="red" variant="soft" size="1">AI metadata failed</Badge>
                            <Text size="1" color="gray">{file.metadataError || "You can still upload and retry after."}</Text>
                          </>
                        )}
                      </Flex>

                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {file.tags.map((tag, index) => (
                          <Badge
                            key={tag}
                            variant="soft"
                            size="1"
                            className={compactImageTagClass}
                            style={getPaletteTagStyle(file.colors, index, file.tags.length)}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(file.id, tag)}
                              className="ml-1 text-current/70 transition-colors hover:text-current"
                            >
                              <Cross2Icon width="10" height="10" />
                            </button>
                          </Badge>
                        ))}
                      </Flex>

                      <TextField.Root
                        placeholder="Add tags..."
                        size="1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(file.id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Flex>
              </Card>
            ))}
          </Grid>

          <Flex justify="end" gap="3" className="pt-4 border-t border-gray-6">
              <Button
                variant="soft"
                color="gray"
                className="pd-action-secondary"
                onClick={() => {
                  files.forEach(file => URL.revokeObjectURL(file.preview));
                  setFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={uploading || files.length === 0 || hasPendingColorSampling || hasPendingMetadataAnalysis}
              size="2"
              variant="soft"
              className="pd-action-primary"
            >
              {uploading ? (
                <Flex align="center" gap="2">
                  <Box className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </Flex>
              ) : hasPendingColorSampling ? (
                <Flex align="center" gap="2">
                  <Box className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sampling colors...
                </Flex>
              ) : hasPendingMetadataAnalysis ? (
                <Flex align="center" gap="2">
                  <Box className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating metadata...
                </Flex>
              ) : (
                `Upload ${files.length} Image${files.length > 1 ? 's' : ''}`
              )}
            </Button>
          </Flex>
        </Box>
      )}

      {/* Processing Images Section */}
      {processingImages && processingImages.length > 0 && (
        <Box className="mt-8 animate-in fade-in">
          <Separator size="4" className="mb-6" />
          <Flex align="center" justify="between" gap="2" className="mb-4">
            <Flex align="center" gap="2">
              <Box className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <Box>
                <Heading size="4">AI Analysis in Progress</Heading>
                <Text size="2" color="gray">
                  Sampling colors and generating metadata...
                </Text>
              </Box>
            </Flex>
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={() => {
                if (!processingImages?.length) return;
                void Promise.all(
                  processingImages.map((img) =>
                    setAiStatusMutation({ imageId: img._id, status: "completed" })
                  )
                )
                  .then(() => toast.success("All marked complete. Processing list cleared."))
                  .catch(() => toast.error("Failed to clear some items."));
              }}
            >
              <CheckIcon /> Mark all complete
            </Button>
          </Flex>

          <Grid columns={{ initial: "2", sm: "3", md: "4" }} gap="4">
            {processingImages.map((image) => (
              <Card key={image._id} className="overflow-hidden opacity-80 p-2 group/card">
                <Box className="relative aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={image.previewUrl || image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover grayscale"
                  />
                  <Box className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <Badge color="purple" variant="solid" size="1">
                      Processing...
                    </Badge>
                  </Box>
                  <Flex
                    gap="1"
                    className="absolute bottom-2 left-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
                  >
                    <Button
                      size="1"
                      variant="soft"
                      color="green"
                      onClick={(e) => {
                        e.stopPropagation();
                        void setAiStatusMutation({ imageId: image._id, status: "completed" })
                          .then(() => toast.success("Marked complete. Image will leave the processing list."))
                          .catch(() => toast.error("Failed to update status."));
                      }}
                    >
                      <CheckIcon /> Mark complete
                    </Button>
                    <Button
                      size="1"
                      variant="soft"
                      color="gray"
                      onClick={(e) => {
                        e.stopPropagation();
                        void setAiStatusMutation({ imageId: image._id, status: "failed" })
                          .then(() => toast.info("Marked failed. You can retry from the failed image."))
                          .catch(() => toast.error("Failed to update status."));
                      }}
                    >
                      Mark failed
                    </Button>
                    <Button
                      size="1"
                      variant="soft"
                      color="gray"
                      className="pd-action-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        void rerunSmartAnalysisMutation({
                          imageId: image._id,
                          storageId: (image as any).storageId,
                          imageUrl: (image as any).imageUrl,
                          title: (image as any).title || "Untitled",
                          description: (image as any).description,
                          tags: (image as any).tags ?? [],
                          category: (image as any).category ?? "general",
                          source: (image as any).source,
                          sref: (image as any).sref,
                          group: (image as any).group,
                          projectName: (image as any).projectName,
                          moodboardName: (image as any).moodboardName,
                        })
                          .then(() => toast.info("Retrying AI analysis…"))
                          .catch(() => toast.error("Failed to retry."));
                      }}
                    >
                      Retry
                    </Button>
                  </Flex>
                </Box>
                <Box className="pt-2">
                  <Text weight="bold" size="1" className="block truncate">{(image as any).title || "Untitled"}</Text>
                </Box>
              </Card>
            ))}
          </Grid>
        </Box>
      )}

      {/* Pending Generated Images Section */}
      {localPendingImages.length > 0 && (
        <Box className="mt-8 animate-in fade-in">
          <Separator size="4" className="mb-6" />
          <Flex align="center" gap="2" className="mb-4">
            <MagicWandIcon width="20" height="20" style={{ color: "var(--pd-green)" }} />
            <Box>
              <Heading size="4">AI Suggestions</Heading>
              <Text size="2" color="gray">
                Review generated variations.
              </Text>
            </Box>
          </Flex>

          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
            {localPendingImages.map((image) => (
              <Card key={image._id} className="overflow-hidden p-0 group relative">
                <Box className="relative aspect-video">
                  <img
                    src={image.previewUrl || image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Buttons container - Always visible on hover, bottom aligned */}
                  <Box className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      color="green"
                      variant="solid"
                      size="1"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        void handleApprove(image._id); 
                      }}
                      className="flex-1 shadow-lg bg-green-500/90 hover:bg-green-500 cursor-pointer"
                    >
                      <CheckIcon /> Keep
                    </Button>
                    <Button
                      color="red"
                      variant="solid"
                      size="1"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        void handleReject(image._id); 
                      }}
                      className="flex-1 shadow-lg bg-red-500/90 hover:bg-red-500 cursor-pointer"
                    >
                      <Cross2Icon /> Discard
                    </Button>
                  </Box>
                </Box>
                <Box className="p-2 bg-gray-50 dark:bg-gray-900/50">
                  <Text weight="medium" size="1" className="block truncate">{(image as any).title}</Text>
                  <Text size="1" color="gray" className="line-clamp-1 text-[10px]">{(image as any).description}</Text>
                </Box>
              </Card>
            ))}
          </Grid>
        </Box>
      )}

      {/* Images for Review Section */}
      {localDraftImages.length > 0 && (
        <Box className="mt-8 animate-in fade-in">
          <Separator size="4" className="mb-6" />
          <Flex align="center" justify="between" className="mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 border border-gray-200 dark:border-gray-800">
             <Flex align="center" gap="2">
                <CheckIcon width="20" height="20" className="text-green-500" />
                <Box>
                <Heading size="4">Review & Finalize</Heading>
                <Text size="2" color="gray">
                    {localDraftImages.length} image{localDraftImages.length !== 1 ? 's' : ''} ready to publish
                </Text>
                </Box>
             </Flex>
             <Button
              onClick={() => void handleFinalizeUploads()}
              size="2"
              color="green"
              variant="soft"
              className="pd-action-primary shadow-sm"
            >
              Finalize All
            </Button>
          </Flex>

          <Grid columns={{ initial: "1", lg: "2" }} gap="4">
            {localDraftImages.map((image) => (
              <Card key={image._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <Flex gap="4">
                  <Box className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800 overflow-hidden relative group">
                    <img
                      src={image.previewUrl || image.imageUrl}
                      alt={image.title}
                      className="w-full h-full object-cover"
                    />
                    {image.aiStatus === "failed" && (
                      <Badge color="red" variant="solid" className="absolute top-1 left-1 text-[10px]">
                        Failed
                      </Badge>
                    )}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <MagnifyingGlassIcon className="text-white w-6 h-6" />
                     </div>
                  </Box>

                  <Box className="flex-1 space-y-2 min-w-0">
                    <Flex justify="between" align="start" gap="2">
                      <Box className="flex-1">
                        <TextField.Root
                          value={image.title}
                          onChange={(e) => void updateImageMetadata(image._id, { title: e.target.value })}
                          placeholder="Title"
                          size="1"
                        >
                          <TextField.Slot>
                            <MagicWandIcon style={{ color: "var(--pd-green)" }} />
                          </TextField.Slot>
                        </TextField.Root>
                      </Box>
                      <IconButton
                        variant="ghost"
                        color="red"
                        size="1"
                        onClick={() => void handleReject(image._id)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Flex>

                    <TextField.Root
                      value={image.description || ""}
                      onChange={(e) => void updateImageMetadata(image._id, { description: e.target.value })}
                      placeholder="Description"
                      size="1"
                    />

                    <Flex gap="2" align="center">
                      <Select.Root
                        value={image.category}
                        onValueChange={(value) => void updateImageMetadata(image._id, { category: value })}
                      >
                        <Select.Trigger size="1" placeholder="Select category" />
                        <Select.Content>
                          {(categories || []).map((category) => (
                            <Select.Item key={category} value={category}>
                              {category}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Flex>

                    {/* Group Selection */}
                    <Select.Root
                      value={image.group ? image.group : "none"}
                      onValueChange={(value) => void updateImageMetadata(image._id, { group: value === "none" ? undefined : value })}
                    >
                      <Select.Trigger size="1" placeholder="Supporting type" />
                      <Select.Content>
                        <Select.Item value="none">None</Select.Item>
                        {supportingGroups.map((group) => (
                          <Select.Item key={group} value={group}>
                            {group}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    {/* Project Name */}
                    <TextField.Root
                      value={image.projectName || ""}
                      onChange={(e) => void updateImageMetadata(image._id, { projectName: e.target.value || undefined })}
                      placeholder="Project Name (e.g., Kitty Bite Back)"
                      size="1"
                    />

                    {/* Unique ID */}
                    <TextField.Root
                      value={image.uniqueId || ""}
                      onChange={(e) => void updateImageMetadata(image._id, { uniqueId: e.target.value || undefined })}
                      placeholder="Unique ID (auto-generated if blank)"
                      size="1"
                    />

                    <Flex gap="2">
                      <TextField.Root
                        value={image.sref || ""}
                        onChange={(e) => void updateImageMetadata(image._id, { sref: e.target.value })}
                        placeholder="Style Ref (sref)"
                        size="1"
                        className="flex-1"
                      />
                      <TextField.Root
                        value={image.source || ""}
                        onChange={(e) => void updateImageMetadata(image._id, { source: e.target.value })}
                        placeholder="Source URL/Origin"
                        size="1"
                        className="flex-1"
                      />
                    </Flex>

                    <Box>
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {image.colors && sortColorsDarkToLight(image.colors).map((color) => (
                          <Box
                            key={color}
                            className="w-3 h-3 rounded-[3px] border"
                            style={getPaletteSwatchStyle(color)}
                            title={color}
                          />
                        ))}
                      </Flex>

                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {image.tags.map((tag, index) => (
                          <Badge
                            key={tag}
                            variant="soft"
                            size="1"
                            className={compactImageTagClass}
                            style={getPaletteTagStyle(image.colors, index, image.tags.length)}
                          >
                            {tag}
                            <button
                              onClick={() => void removeTagFromDraft(image._id, tag)}
                              className="ml-1 text-current/70 transition-colors hover:text-current"
                            >
                              <Cross2Icon width="10" height="10" />
                            </button>
                          </Badge>
                        ))}
                      </Flex>

                      <TextField.Root
                        placeholder="Add tags..."
                        size="1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void addTagToDraft(image._id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </Box>

                    {image.aiStatus === "failed" && (
                      <Box className="space-y-2">
                        <Badge color="red" variant="soft" size="2">
                          AI Analysis Failed
                        </Badge>
                        <Text size="1" color="gray">
                          Check Convex logs for the exact failure. This can be caused by AI provider config or downstream media persistence errors.
                        </Text>
                        {image.nextcloudPersistError && (
                          <Box className="space-y-1 rounded border border-amber-500/30 bg-amber-500/10 p-2">
                            <Text size="1" weight="medium" style={{ color: "#f6c453" }}>
                              Media persistence warning
                            </Text>
                            <Text size="1" color="gray">
                              {image.nextcloudPersistError}
                            </Text>
                          </Box>
                        )}
                        <Button
                          color="orange"
                          variant="soft"
                          size="1"
                          onClick={() => void reRunAnalysis(
                             image._id,
                             image.storageId,
                             image.imageUrl,
                             image.title,
                             image.description,
                             image.tags,
                             image.category,
                             image.source,
                             image.sref,
                             image.variationCount,
                             image.modificationMode
                           )}
                        >
                          <MagicWandIcon /> Re-run AI Analysis
                        </Button>
                      </Box>
                    )}
                    {image.aiStatus !== "failed" && image.nextcloudPersistError && (
                      <Box className="space-y-1 rounded border border-amber-500/30 bg-amber-500/10 p-2">
                        <Text size="1" weight="medium" style={{ color: "#f6c453" }}>
                          Media persistence warning
                        </Text>
                        <Text size="1" color="gray">
                          {image.nextcloudPersistError}
                        </Text>
                      </Box>
                    )}

                    {/* Generate Variations Button - shown when analysis is complete */}
                    {image.aiStatus === "completed" && (
                      <Flex gap="2" className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="soft"
                          size="1"
                          onClick={() => openVariationModal(image._id)}
                          className="pd-action-primary flex-1"
                        >
                          <MagicWandIcon /> Generate Variations
                        </Button>
                      </Flex>
                    )}
                    {image.aiStatus === "processing" && (
                      <Flex align="center" gap="2" className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Box className="w-3 h-3 border-2 border-[var(--pd-green)] border-t-transparent rounded-full animate-spin" />
                        <Text size="1" color="gray">Analyzing metadata and sampled colors...</Text>
                      </Flex>
                    )}
                  </Box>
                </Flex>
              </Card>
            ))}
          </Grid>
        </Box>
      )}
        </>
      )}
    </Box>
  );
}
