import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Card, Text, Flex, Box, Button, TextField, Select,
  Badge, IconButton, Grid, TextArea
} from "@radix-ui/themes";
import { UploadIcon, Cross2Icon, TrashIcon } from "@radix-ui/react-icons";
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

  const handleFiles = async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    const newUploadFilesPromises = imageFiles.map(async (file): Promise<UploadFile> => {
      const preview = URL.createObjectURL(file);
      let colors: string[] = [];
      try {
        colors = await extractColorsFromImage(preview);
      } catch (error) {
        console.error('Color extraction failed:', error);
        toast.warning(`Could not extract colors for ${file.name}`);
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview,
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: "",
        tags: [],
        category: "general",
        source: "",
        sref: "",
        colors,
      };
    });

    const newUploadFiles = await Promise.all(newUploadFilesPromises);
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
    if (e.dataTransfer.files?.[0]) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
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
      f.id === fileId && !f.tags.includes(trimmedTag)
        ? { ...f, tags: [...f.tags, trimmedTag] }
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
    const toastId = toast.loading(`Uploading ${files.length} image(s)...`);

    try {
      const uploadPromises = files.map(async (file) => {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.file.type },
          body: file.file,
        });
        
        if (!response.ok) throw new Error(`Upload failed for ${file.file.name}`);
        const { storageId } = await response.json();
        
        return {
          storageId,
          title: file.title,
          description: file.description || undefined,
          tags: file.tags,
          category: file.category,
          source: file.source || undefined,
          sref: file.sref || undefined,
          colors: file.colors.length > 0 ? file.colors : undefined,
        };
      });

      const uploads = await Promise.all(uploadPromises);
      await uploadMultiple({ uploads });
      
      toast.success(`Successfully uploaded ${files.length} image(s)!`, { id: toastId });
      
      files.forEach(file => URL.revokeObjectURL(file.preview));
      setFiles([]);
      
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box className="space-y-8">
      <Box>
        <Text size="6" weight="bold">Upload Images</Text>
        <Text as="p" size="2" color="gray" className="mt-1">
          Drag and drop images or click to browse. Edit details before uploading.
        </Text>
      </Box>

      <Card 
        variant="surface"
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragActive ? 'border-accent-9 bg-accent-2' : 'border-gray-6 hover:border-gray-7'
        }`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Box className="p-8 text-center">
          <UploadIcon width="48" height="48" className="mx-auto mb-4 text-gray-10" />
          <Text as="p" size="4" weight="medium" className="mb-2">
            Drop images here or click to browse
          </Text>
          <Text size="2" color="gray">
            Supports JPG, PNG, GIF, WebP.
          </Text>
          <input
            ref={fileInputRef} type="file" multiple accept="image/*"
            onChange={handleFileInput} className="hidden"
          />
        </Box>
      </Card>

      {files.length > 0 && (
        <Box className="space-y-6">
          <Flex justify="between" align="center">
            <Text size="3" weight="medium">
              {files.length} image{files.length > 1 ? 's' : ''} ready for upload
            </Text>
            <Button variant="soft" color="red" size="2" onClick={() => {
              files.forEach(file => URL.revokeObjectURL(file.preview));
              setFiles([]);
            }}>
              <TrashIcon /> Clear All
            </Button>
          </Flex>

          <Grid columns={{ initial: "1", md: "2" }} gap="6">
            {files.map((file) => (
              <Card key={file.id} size="2">
                <Flex gap="4">
                  <Box className="w-32 h-32 flex-shrink-0 rounded-md overflow-hidden">
                    <img src={file.preview} alt={file.title} className="w-full h-full object-cover" />
                  </Box>
                  <Flex direction="column" gap="2" className="flex-grow">
                    <TextField.Root value={file.title}
                      onChange={(e) => updateFile(file.id, { title: e.target.value })}
                      placeholder="Image title" size="2"
                    />
                    <IconButton variant="ghost" color="gray" size="1"
                      onClick={() => removeFile(file.id)}
                      className="absolute top-2 right-2"
                    >
                      <Cross2Icon />
                    </IconButton>
                  </Flex>
                </Flex>
                <Box mt="4" className="space-y-4">
                  <TextArea value={file.description}
                    onChange={(e) => updateFile(file.id, { description: e.target.value })}
                    placeholder="Description (optional)" size="2"
                  />

                  <Grid columns="2" gap="4">
                    <Box>
                      <Text as="label" size="1" color="gray" className="mb-1 block">Category</Text>
                      <Select.Root value={file.category} onValueChange={(v) => updateFile(file.id, { category: v })}>
                        <Select.Trigger size="2" className="w-full" />
                        <Select.Content>
                          {categories?.map((c) => <Select.Item key={c} value={c}>{c}</Select.Item>)}
                        </Select.Content>
                      </Select.Root>
                    </Box>
                    <Box>
                      <Text as="label" size="1" color="gray" className="mb-1 block">Source URL</Text>
                      <TextField.Root value={file.source}
                        onChange={(e) => updateFile(file.id, { source: e.target.value })}
                        placeholder="Optional" size="2"
                      />
                    </Box>
                  </Grid>

                  <Box>
                    <Text as="label" size="1" color="gray" className="mb-1 block">Tags</Text>
                    <Flex gap="2" wrap="wrap" align="center">
                      {file.tags.map((tag) => (
                        <Badge key={tag} variant="soft" color="gray" size="2">
                          {tag}
                          <IconButton size="1" variant="ghost" color="gray"
                            onClick={() => removeTag(file.id, tag)} className="ml-1"
                          >
                            <Cross2Icon />
                          </IconButton>
                        </Badge>
                      ))}
                    </Flex>
                    <TextField.Root placeholder="Add a tag..." size="2" mt="2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          e.preventDefault();
                          addTag(file.id, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </Box>

                  {file.colors.length > 0 && (
                    <Box>
                      <Text as="label" size="1" color="gray" className="mb-2 block">Color Palette</Text>
                      <Flex gap="2" wrap="wrap">
                        {file.colors.map((color, index) => (
                          <Box key={index} title={color}
                            className="w-6 h-6 rounded-full border-2 border-gray-4"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </Flex>
                    </Box>
                  )}
                </Box>
              </Card>
            ))}
          </Grid>

          <Flex justify="end" gap="3" mt="6">
            <Button variant="soft" color="gray" size="3" onClick={() => {
              files.forEach(file => URL.revokeObjectURL(file.preview));
              setFiles([]);
            }}>Cancel</Button>
            <Button size="3" onClick={handleSubmit} disabled={uploading || files.length === 0}>
              {uploading ? "Uploading..." : `Upload ${files.length} Image(s)`}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
