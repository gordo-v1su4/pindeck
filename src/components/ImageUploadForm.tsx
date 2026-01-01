import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { extractColorsFromImage } from "../lib/colorExtraction";
import { getTagColor, sortColorsDarkToLight } from "../lib/utils";
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
  Separator
} from "@radix-ui/themes";
import {
  UploadIcon,
  Cross2Icon,
  ImageIcon,
  PlusIcon,
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
  projectName?: string;
  moodboardName?: string;
  uniqueId?: string;
}

export function ImageUploadForm() {
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadMultiple = useMutation(api.images.uploadMultiple);
  const categories = useQuery(api.images.getCategories);
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

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
      group?: string;
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
      uniqueId: undefined,
    }));

    setFiles(prev => [...prev, ...newUploadFiles]);

    // Extract colors asynchronously
    try {
      const filesWithColors = await Promise.all(newUploadFiles.map(async (fileObj) => {
        try {
          const colors = await extractColorsFromImage(fileObj.preview);
          return { ...fileObj, colors };
        } catch (e) {
          console.error("Color extraction failed for", fileObj.file.name, e);
          return fileObj;
        }
      }));

      setFiles(prev => prev.map(f => {
        const updated = filesWithColors.find(fwc => fwc.id === f.id);
        return updated || f;
      }));
    } catch (e) {
      console.error("Error in color extraction process", e);
    }
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
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileInput called", e.target.files?.length);
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
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
    storageId: Id<"_storage">,
    title: string,
    description?: string,
    tags?: string[],
    category?: string,
    source?: string,
    sref?: string
  ) => {
    try {
      toast.info("Re-running AI analysis...");
      await rerunSmartAnalysisMutation({
        imageId,
        storageId,
        title,
        description,
        tags: tags || [],
        category: category || "general",
        source,
        sref,
      });
    } catch (error) {
      console.error("Failed to re-run analysis:", error);
      toast.error("Failed to re-run AI analysis.");
    }
  };

  const handleFinalizeUploads = async () => {
    if (!draftImages || draftImages.length === 0) return;

    try {
      const imageIdsToFinalize = draftImages.map(img => img._id);
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

    setUploading(true);
    try {
      // Upload files to storage
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

        // Auto-generate title from projectName + moodboardName if provided
        let generatedTitle = file.title;
        if (!generatedTitle && (file.projectName || file.moodboardName)) {
          if (file.projectName && file.moodboardName) {
            generatedTitle = `${file.projectName} - ${file.moodboardName}`;
          } else if (file.projectName) {
            generatedTitle = file.projectName;
          } else if (file.moodboardName) {
            generatedTitle = file.moodboardName;
          }
        }
        
        // Generate uniqueId if not provided
        const uniqueId = file.uniqueId || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          storageId,
          title: generatedTitle || file.file.name, // Use filename if title is empty
          description: file.description || undefined,
          tags: file.tags,
          category: file.category,
          source: file.source || undefined,
          sref: file.sref || undefined,
          colors: file.colors,
          group: file.group || undefined,
          projectName: file.projectName || undefined,
          moodboardName: file.moodboardName || undefined,
          uniqueId: uniqueId,
        };
      });

      const uploads = await Promise.all(uploadPromises);

      const newImageIds = await uploadMultiple({ uploads });

      // Clear local files after successful initial upload and scheduling
      files.forEach(file => URL.revokeObjectURL(file.preview));
      setFiles([]);

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

  return (
    <Box className="space-y-8 max-w-4xl mx-auto w-full">
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
            ? 'bg-blue-3 ring-2 ring-blue-9 ring-offset-2'
            : 'bg-gray-2 hover:bg-gray-3'
          }
        `}
        style={{ minHeight: '150px' }}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          aria-label="Upload image files"
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
                          aria-label="Image title"
                          size="1"
                        >
                          <TextField.Slot>
                            <MagicWandIcon className="text-purple-400" />
                          </TextField.Slot>
                        </TextField.Root>
                      </Box>
                      <IconButton
                        variant="ghost"
                        color="red"
                        size="1"
                        aria-label="Remove file"
                        onClick={() => removeFile(file.id)}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>

                    <TextField.Root
                      value={file.description}
                      onChange={(e) => updateFile(file.id, { description: e.target.value })}
                      placeholder="Description (Leave blank for AI)"
                      aria-label="Image description"
                      size="1"
                    />
                    
                    <Flex gap="2" align="center">
                      <Select.Root
                        value={file.category}
                        onValueChange={(value) => updateFile(file.id, { category: value })}
                      >
                        <Select.Trigger placeholder="Select category" aria-label="Category" />
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
                      value={file.group ? file.group : "none"}
                      onValueChange={(value) => updateFile(file.id, { group: value === "none" ? undefined : value })}
                    >
                      <Select.Trigger placeholder="Group (e.g., Commercial, Film, Music Video)" aria-label="Group" />
                      <Select.Content>
                        <Select.Item value="none">None</Select.Item>
                        <Select.Item value="Commercial">Commercial</Select.Item>
                        <Select.Item value="Film">Film</Select.Item>
                        <Select.Item value="Moodboard">Moodboard</Select.Item>
                        <Select.Item value="Spec Commercial">Spec Commercial</Select.Item>
                        <Select.Item value="Spec Music Video">Spec Music Video</Select.Item>
                        <Select.Item value="Music Video">Music Video</Select.Item>
                        <Select.Item value="TV">TV</Select.Item>
                        <Select.Item value="Other">Other</Select.Item>
                      </Select.Content>
                    </Select.Root>

                    {/* Project Name */}
                    <TextField.Root
                      value={file.projectName || ""}
                      onChange={(e) => updateFile(file.id, { projectName: e.target.value || undefined })}
                      placeholder="Project Name (e.g., Kitty Bite Back)"
                      aria-label="Project Name"
                      size="1"
                    />

                    {/* Moodboard Name */}
                    <TextField.Root
                      value={file.moodboardName || ""}
                      onChange={(e) => updateFile(file.id, { moodboardName: e.target.value || undefined })}
                      placeholder="Moodboard Name (e.g., pink girl smoking)"
                      aria-label="Moodboard Name"
                      size="1"
                    />

                    {/* Unique ID */}
                    <TextField.Root
                      value={file.uniqueId || ""}
                      onChange={(e) => updateFile(file.id, { uniqueId: e.target.value || undefined })}
                      placeholder="Unique ID (auto-generated if blank)"
                      aria-label="Unique ID"
                      size="1"
                    />

                    <Flex gap="2">
                      <TextField.Root
                        value={file.sref}
                        onChange={(e) => updateFile(file.id, { sref: e.target.value })}
                        placeholder="Style Ref (sref)"
                        aria-label="Style Reference"
                        size="1"
                        className="flex-1"
                      />
                      <TextField.Root
                        value={file.source}
                        onChange={(e) => updateFile(file.id, { source: e.target.value })}
                        placeholder="Source URL/Origin"
                        aria-label="Source URL"
                        size="1"
                        className="flex-1"
                      />
                    </Flex>

                    <Box>
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {sortColorsDarkToLight(file.colors || []).map((color) => (
                          <Box
                            key={color}
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </Flex>

                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {file.tags.map((tag) => (
                          <Badge key={tag} variant="soft" size="1" color={getTagColor(tag)}>
                            {tag}
                            <button
                              onClick={() => removeTag(file.id, tag)}
                              className="ml-1 hover:text-red-600"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <Cross2Icon width="10" height="10" />
                            </button>
                          </Badge>
                        ))}
                      </Flex>

                      <TextField.Root
                        placeholder="Add tags..."
                        aria-label="Add tags"
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
              onClick={() => {
                files.forEach(file => URL.revokeObjectURL(file.preview));
                setFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || files.length === 0}
              size="2"
            >
              {uploading ? (
                <Flex align="center" gap="2">
                  <Box className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Uploading...
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
          <Flex align="center" gap="2" className="mb-4">
            <Box className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <Box>
              <Heading size="4">AI Analysis in Progress</Heading>
              <Text size="2" color="gray">
                Generating variations...
              </Text>
            </Box>
          </Flex>

          <Grid columns={{ initial: "2", sm: "3", md: "4" }} gap="4">
            {processingImages.map((image) => (
              <Card key={image._id} className="overflow-hidden opacity-80 p-2">
                <Box className="relative aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover grayscale"
                  />
                  <Box className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <Badge color="purple" variant="solid" size="1">
                      Processing...
                    </Badge>
                  </Box>
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
      {pendingImages && pendingImages.length > 0 && (
        <Box className="mt-8 animate-in fade-in">
          <Separator size="4" className="mb-6" />
          <Flex align="center" gap="2" className="mb-4">
            <MagicWandIcon width="20" height="20" className="text-purple-500" />
            <Box>
              <Heading size="4">AI Suggestions</Heading>
              <Text size="2" color="gray">
                Review generated variations.
              </Text>
            </Box>
          </Flex>

          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
            {pendingImages.map((image) => (
              <Card key={image._id} className="overflow-hidden p-0 group relative">
                <Box className="relative aspect-video">
                  <img
                    src={image.imageUrl}
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
                        handleApprove(image._id); 
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
                        handleReject(image._id); 
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
      {draftImages && draftImages.length > 0 && (
        <Box className="mt-8 animate-in fade-in">
          <Separator size="4" className="mb-6" />
          <Flex align="center" justify="between" className="mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 border border-gray-200 dark:border-gray-800">
             <Flex align="center" gap="2">
                <CheckIcon width="20" height="20" className="text-green-500" />
                <Box>
                <Heading size="4">Review & Finalize</Heading>
                <Text size="2" color="gray">
                    {draftImages.length} image{draftImages.length !== 1 ? 's' : ''} ready to publish
                </Text>
                </Box>
             </Flex>
             <Button
              onClick={handleFinalizeUploads}
              size="2"
              color="green"
              className="shadow-sm"
            >
              Finalize All
            </Button>
          </Flex>

          <Grid columns={{ initial: "1", lg: "2" }} gap="4">
            {draftImages.map((image) => (
              <Card key={image._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <Flex gap="4">
                  <Box className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800 overflow-hidden relative group">
                    <img
                      src={image.imageUrl}
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
                          onChange={(e) => updateImageMetadata(image._id, { title: e.target.value })}
                          placeholder="Title"
                          aria-label="Image title"
                          size="1"
                        >
                          <TextField.Slot>
                            <MagicWandIcon className="text-purple-400" />
                          </TextField.Slot>
                        </TextField.Root>
                      </Box>
                      <IconButton
                        variant="ghost"
                        color="red"
                        size="1"
                        aria-label="Discard draft"
                        onClick={() => handleReject(image._id)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Flex>

                    <TextField.Root
                      value={image.description || ""}
                      onChange={(e) => updateImageMetadata(image._id, { description: e.target.value })}
                      placeholder="Description"
                      aria-label="Image description"
                      size="1"
                    />

                    <Flex gap="2" align="center">
                      <Select.Root
                        value={image.category}
                        onValueChange={(value) => updateImageMetadata(image._id, { category: value })}
                      >
                        <Select.Trigger placeholder="Select category" aria-label="Category" />
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
                      onValueChange={(value) => updateImageMetadata(image._id, { group: value === "none" ? undefined : value })}
                    >
                      <Select.Trigger placeholder="Group (e.g., Commercial, Film, Music Video)" aria-label="Group" />
                      <Select.Content>
                        <Select.Item value="none">None</Select.Item>
                        <Select.Item value="Commercial">Commercial</Select.Item>
                        <Select.Item value="Film">Film</Select.Item>
                        <Select.Item value="Moodboard">Moodboard</Select.Item>
                        <Select.Item value="Spec Commercial">Spec Commercial</Select.Item>
                        <Select.Item value="Spec Music Video">Spec Music Video</Select.Item>
                        <Select.Item value="Music Video">Music Video</Select.Item>
                        <Select.Item value="TV">TV</Select.Item>
                        <Select.Item value="Other">Other</Select.Item>
                      </Select.Content>
                    </Select.Root>

                    {/* Project Name */}
                    <TextField.Root
                      value={image.projectName || ""}
                      onChange={(e) => updateImageMetadata(image._id, { projectName: e.target.value || undefined })}
                      placeholder="Project Name (e.g., Kitty Bite Back)"
                      aria-label="Project Name"
                      size="1"
                    />

                    {/* Moodboard Name */}
                    <TextField.Root
                      value={image.moodboardName || ""}
                      onChange={(e) => updateImageMetadata(image._id, { moodboardName: e.target.value || undefined })}
                      placeholder="Moodboard Name (e.g., pink girl smoking)"
                      aria-label="Moodboard Name"
                      size="1"
                    />

                    {/* Unique ID */}
                    <TextField.Root
                      value={image.uniqueId || ""}
                      onChange={(e) => updateImageMetadata(image._id, { uniqueId: e.target.value || undefined })}
                      placeholder="Unique ID (auto-generated if blank)"
                      aria-label="Unique ID"
                      size="1"
                    />

                    <Flex gap="2">
                      <TextField.Root
                        value={image.sref || ""}
                        onChange={(e) => updateImageMetadata(image._id, { sref: e.target.value })}
                        placeholder="Style Ref (sref)"
                        aria-label="Style Reference"
                        size="1"
                        className="flex-1"
                      />
                      <TextField.Root
                        value={image.source || ""}
                        onChange={(e) => updateImageMetadata(image._id, { source: e.target.value })}
                        placeholder="Source URL/Origin"
                        aria-label="Source URL"
                        size="1"
                        className="flex-1"
                      />
                    </Flex>

                    <Box>
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {image.colors && sortColorsDarkToLight(image.colors).map((color) => (
                          <Box
                            key={color}
                            className="w-3 h-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </Flex>

                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {image.tags.map((tag) => (
                          <Badge key={tag} variant="soft" size="1" color={getTagColor(tag)}>
                            {tag}
                            <button
                              onClick={() => removeTagFromDraft(image._id, tag)}
                              className="ml-1 hover:text-red-600"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <Cross2Icon width="10" height="10" />
                            </button>
                          </Badge>
                        ))}
                      </Flex>

                      <TextField.Root
                        placeholder="Add tags..."
                        aria-label="Add tags"
                        size="1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTagToDraft(image._id, e.currentTarget.value);
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
                          Check console logs or ensure OPEN_ROUTER_KEY and FAL_KEY are set in Convex environment variables.
                        </Text>
                        <Button
                          color="orange"
                          variant="soft"
                          size="1"
                          onClick={() => reRunAnalysis(image._id, image.storageId!,
                             image.title, image.description, image.tags, image.category, image.source, image.sref)}
                        >
                          <MagicWandIcon /> Re-run AI Analysis
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Flex>
              </Card>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}