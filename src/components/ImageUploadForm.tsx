import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
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
  Separator
} from "@radix-ui/themes";
import { 
  UploadIcon, 
  Cross2Icon, 
  ImageIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  MagicWandIcon
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
}

export function ImageUploadForm() {
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadMultiple = useMutation(api.images.uploadMultiple);
  const categories = useQuery(api.images.getCategories);
  
  // Pending Images Logic
  const pendingImages = useQuery(api.images.getPendingImages);
  const processingImages = useQuery(api.images.getProcessingImages);
  const approveImage = useMutation(api.images.approveImage);
  const rejectImage = useMutation(api.images.rejectImage);
  
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    const newUploadFiles: UploadFile[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      title: "", // Default to empty to trigger AI generation
      description: "",
      tags: [],
      category: "general",
      source: "",
      sref: "",
      colors: [],
    }));

    setFiles(prev => [...prev, ...newUploadFiles]);

    // Extract colors asynchronously
    newUploadFiles.forEach(async (fileObj) => {
      const colors = await extractColorsFromImage(fileObj.preview);
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, colors } : f));
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
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
        
        return {
          storageId,
          title: file.title || file.file.name, // Use filename if title is empty
          description: file.description || undefined,
          tags: file.tags,
          category: file.category,
          source: file.source || undefined,
          sref: file.sref || undefined,
          colors: file.colors,
        };
      });

      const uploads = await Promise.all(uploadPromises);
      
      const newImageIds = await uploadMultiple({ uploads });
      
      toast.success(`Successfully uploaded ${files.length} image${files.length > 1 ? 's' : ''}!`);
      
      // Clear files after successful upload
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
      toast.success("Image approved and added to your board!");
    } catch (error) {
      toast.error("Failed to approve image");
    }
  };

  const handleReject = async (imageId: Id<"images">) => {
    try {
      await rejectImage({ imageId });
      toast.success("Image discarded");
    } catch (error) {
      toast.error("Failed to reject image");
    }
  };

  return (
    <Box className="space-y-8 max-w-4xl mx-auto">
      <Box>
        <Heading size="6" weight="bold">Upload Images</Heading>
        <Text size="2" color="gray" className="mt-1">
          Upload images to your collection. Leave details blank to let AI generate them.
        </Text>
      </Box>

      {/* Refined Drop Zone */}
      <Box
        className={`
          relative overflow-hidden rounded-xl transition-all duration-200 ease-in-out
          ${dragActive 
            ? 'bg-blue-50 ring-2 ring-blue-500 ring-offset-2' 
            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
          }
        `}
        style={{ minHeight: '200px' }}
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
        <Flex direction="column" align="center" justify="center" className="h-full py-10 px-4 text-center pointer-events-none">
          <Box className="bg-white dark:bg-gray-900 p-4 rounded-full shadow-sm mb-4">
            <UploadIcon width="32" height="32" className="text-blue-500" />
          </Box>
          <Text size="4" weight="medium" className="mb-2">
            Click to upload or drag and drop
          </Text>
          <Text size="2" color="gray" className="max-w-xs">
            SVG, PNG, JPG or GIF (max. 10MB)
          </Text>
        </Flex>
      </Box>

      {/* File List */}
      {files.length > 0 && (
        <Box className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <Flex justify="between" align="center">
            <Text size="3" weight="medium">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </Text>
            <Button
              variant="ghost"
              color="red"
              size="2"
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
                  <Box className="w-32 h-32 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    <img
                      src={file.preview}
                      alt={file.title}
                      className="w-full h-full object-cover"
                    />
                  </Box>
                  
                  <Box className="flex-1 space-y-3 min-w-0">
                    <Flex justify="between" align="start" gap="2">
                      <Box className="flex-1">
                        <TextField.Root
                          value={file.title}
                          onChange={(e) => updateFile(file.id, { title: e.target.value })}
                          placeholder="Title (Leave blank for AI)"
                          size="2"
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
                        onClick={() => removeFile(file.id)}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>

                    <TextField.Root
                      value={file.description}
                      onChange={(e) => updateFile(file.id, { description: e.target.value })}
                      placeholder="Description (Leave blank for AI)"
                      size="2"
                    />

                    <Flex gap="2" align="center">
                      <Select.Root
                        value={file.category}
                        onValueChange={(value) => updateFile(file.id, { category: value })}
                      >
                        <Select.Trigger size="1" placeholder="Select category" />
                        <Select.Content>
                          {categories?.map((category) => (
                            <Select.Item key={category} value={category}>
                              {category}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Flex>

                    <Box>
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {file.colors.map((color) => (
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
                          <Badge key={tag} variant="soft" size="1" color="blue">
                            {tag}
                            <button
                              onClick={() => removeTag(file.id, tag)}
                              className="ml-1 hover:text-red-600"
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

          <Flex justify="end" gap="3" className="pt-4 border-t border-gray-100 dark:border-gray-800">
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
              size="3"
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
        <Box className="mt-12 animate-in fade-in">
          <Separator size="4" className="mb-8" />
          <Flex align="center" gap="2" className="mb-6">
            <Box className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <Box>
              <Heading size="5">AI Analysis in Progress</Heading>
              <Text size="2" color="gray">
                Analyzing your images and generating variations...
              </Text>
            </Box>
          </Flex>

          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
            {processingImages.map((image) => (
              <Card key={image._id} className="overflow-hidden opacity-80">
                <Box className="relative aspect-video">
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover grayscale"
                  />
                  <Box className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <Badge color="purple" variant="solid" size="2">
                      Processing...
                    </Badge>
                  </Box>
                </Box>
                <Box className="p-3">
                  <Text weight="bold" size="2" className="block truncate">{image.title || "Untitled"}</Text>
                  <Text size="1" color="gray">Analyzing image content...</Text>
                </Box>
              </Card>
            ))}
          </Grid>
        </Box>
      )}

      {/* Pending Generated Images Section */}
      {pendingImages && pendingImages.length > 0 && (
        <Box className="mt-12 animate-in fade-in">
          <Separator size="4" className="mb-8" />
          <Flex align="center" gap="2" className="mb-6">
            <MagicWandIcon width="24" height="24" className="text-purple-500" />
            <Box>
              <Heading size="5">AI Generated Suggestions</Heading>
              <Text size="2" color="gray">
                Review these variations generated based on your uploads.
              </Text>
            </Box>
          </Flex>

          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
            {pendingImages.map((image) => (
              <Card key={image._id} className="overflow-hidden">
                <Box className="relative aspect-video group">
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <Box className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      color="green" 
                      variant="solid" 
                      onClick={() => handleApprove(image._id)}
                    >
                      <CheckIcon /> Keep
                    </Button>
                    <Button 
                      color="red" 
                      variant="solid" 
                      onClick={() => handleReject(image._id)}
                    >
                      <Cross2Icon /> Discard
                    </Button>
                  </Box>
                </Box>
                <Box className="p-3">
                  <Text weight="bold" size="2" className="block truncate">{image.title}</Text>
                  <Text size="1" color="gray" className="line-clamp-2">{image.description}</Text>
                </Box>
              </Card>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}