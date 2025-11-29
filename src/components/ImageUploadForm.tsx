import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
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
  Grid
} from "@radix-ui/themes";
import { 
  UploadIcon, 
  Cross2Icon, 
  ImageIcon,
  PlusIcon,
  TrashIcon
} from "@radix-ui/react-icons";
import { toast } from "sonner";
import { extractColorsFromImage } from "../lib/colorExtraction";

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
  
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    const newUploadFiles: UploadFile[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: "",
      tags: [],
      category: "general",
      source: "",
      sref: "",
      colors: [],
    }));

    setFiles(prev => [...prev, ...newUploadFiles]);
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
          title: file.title,
          description: file.description || undefined,
          tags: file.tags,
          category: file.category,
          source: file.source || undefined,
          sref: file.sref || undefined,
          colors: [], // Colors will be extracted by the backend
        };
      });

      const uploads = await Promise.all(uploadPromises);
      
      // Create image records in the database
      const newImageIds = await uploadMultiple({ uploads });
      
      toast.success(`Successfully uploaded ${files.length} image${files.length > 1 ? 's' : ''}!`);
      
      // Trigger smart analysis for each new image
      if (newImageIds) {
        for (let i = 0; i < newImageIds.length; i++) {
          const imageId = newImageIds[i];
          const storageId = uploads[i].storageId;
          
          // Don't await this, let it run in the background
          fetch("/smartAnalyzeImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageId, imageId }),
          }).catch(console.error);
        }
      }

      // Clean up
      files.forEach(file => URL.revokeObjectURL(file.preview));
      setFiles([]);
      
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box className="space-y-6">
      <Box>
        <Text size="6" weight="bold">Upload Images</Text>
        <Text size="2" color="gray" className="mt-1">
          Upload multiple images and organize them with metadata
        </Text>
      </Box>

      {/* Drop Zone */}
      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Box className="p-8 text-center">
          <UploadIcon width="48" height="48" className="mx-auto mb-4 text-gray-400" />
          <Text size="4" weight="medium" className="mb-2">
            Drop images here or click to browse
          </Text>
          <Text size="2" color="gray">
            Supports JPG, PNG, GIF, WebP up to 10MB each
          </Text>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </Box>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Box className="space-y-4">
          <Flex justify="between" align="center">
            <Text size="3" weight="medium">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </Text>
            <Button
              variant="soft"
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
              <Card key={file.id} className="overflow-hidden">
                <Flex>
                  <Box className="w-32 h-32 bg-gray-100 flex items-center justify-center">
                    <img
                      src={file.preview}
                      alt={file.title}
                      className="w-full h-full object-cover"
                    />
                  </Box>
                  
                  <Box className="flex-1 p-4 space-y-3">
                    <Flex justify="between" align="start">
                      <Box className="flex-1">
                        <TextField.Root
                          value={file.title}
                          onChange={(e) => updateFile(file.id, { title: e.target.value })}
                          placeholder="Image title"
                          size="2"
                        />
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
                      placeholder="Description (optional)"
                      size="2"
                    />

                    <Flex gap="2" align="center">
                      <Text size="1" color="gray">Category:</Text>
                      <Select.Root
                        value={file.category}
                        onValueChange={(value) => updateFile(file.id, { category: value })}
                      >
                        <Select.Trigger size="1" />
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
                      <Text size="1" color="gray" className="mb-1">Tags:</Text>
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {file.tags.map((tag) => (
                          <Badge key={tag} variant="soft" size="1">
                            {tag}
                            <button
                              onClick={() => removeTag(file.id, tag)}
                              className="ml-1 hover:text-red-500"
                            >
                              <Cross2Icon width="10" height="10" />
                            </button>
                          </Badge>
                        ))}
                      </Flex>
                      
                      {/* Quick Tag Buttons */}
                      <Flex gap="1" wrap="wrap" className="mb-2">
                        {['photography', 'design', 'art', 'digital', 'vintage', 'modern', 'minimalist', 'colorful', 'dark', 'light'].map((quickTag) => (
                          <Button
                            key={quickTag}
                            variant="ghost"
                            size="1"
                            onClick={() => addTag(file.id, quickTag)}
                            disabled={file.tags.includes(quickTag)}
                          >
                            {quickTag}
                          </Button>
                        ))}
                      </Flex>
                      
                      <TextField.Root
                        placeholder="Add custom tag..."
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

                    <TextField.Root
                      value={file.source}
                      onChange={(e) => updateFile(file.id, { source: e.target.value })}
                      placeholder="Source URL (optional)"
                      size="2"
                    />

                    <Box>
                      <Text size="1" color="gray" className="mb-1">Midjourney Style Reference:</Text>
                      <TextField.Root
                        value={file.sref}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Auto-format as user types
                          if (value && !value.startsWith('--sref ')) {
                            value = value.replace(/^(\d+)$/, '--sref $1');
                          }
                          updateFile(file.id, { sref: value });
                        }}
                        placeholder="1234567890 (auto-formats to --sref)"
                        size="2"
                      />
                      <Text size="1" color="gray" className="mt-1">
                        Enter just the number, it will auto-format to --sref format
                      </Text>
                    </Box>

                    {file.colors.length > 0 && (
                      <Box>
                        <Text size="1" color="gray" className="mb-1">Extracted Colors:</Text>
                        <Flex gap="1" wrap="wrap">
                          {file.colors.map((color, index) => (
                            <Box
                              key={index}
                              className="w-6 h-6 rounded border border-gray-6"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </Flex>
                      </Box>
                    )}
                  </Box>
                </Flex>
              </Card>
            ))}
          </Grid>

          <Flex justify="end" gap="3">
            <Button
              variant="soft"
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
            >
              {uploading ? "Uploading..." : `Upload ${files.length} Image${files.length > 1 ? 's' : ''}`}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
