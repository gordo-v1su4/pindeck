import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ImageModal } from "./ImageModal";
import { HeartIcon, EyeOpenIcon, BookmarkIcon } from "@radix-ui/react-icons";
import { IconButton, Text, Flex, Box, Spinner, Button, Badge } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ImageGridProps {
  searchTerm: string;
  selectedCategory: string | undefined;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}

type ViewMode = "random" | "project-rows" | "list";

export function ImageGrid({ searchTerm, selectedCategory, setActiveTab, incrementBoardVersion }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<Id<"images"> | null>(null);
  const [triggerPosition, setTriggerPosition] = useState<{ x: number; y: number } | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("random");
  const boards = useQuery(api.boards.list);
  const addImageToBoard = useMutation(api.boards.addImage);
  
  const images = useQuery(
    searchTerm 
      ? api.images.search 
      : api.images.list,
    searchTerm 
      ? { searchTerm, category: selectedCategory }
      : { category: selectedCategory }
  );

  const toggleLike = useMutation(api.images.toggleLike);

  const handleLike = async (imageId: Id<"images">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike({ imageId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleQuickSave = async (imageId: Id<"images">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!boards || boards.length === 0) {
      setActiveTab("boards");
      toast.info("Create a board first to save images");
      return;
    }
    // Save to first board for quick save
    try {
      await addImageToBoard({ boardId: boards[0]._id, imageId });
      toast.success("Saved to board!");
    } catch (error: any) {
      if (error.message?.includes("already in board")) {
        toast.info("Already in board");
      } else {
        toast.error("Failed to save");
      }
    }
  };

  if (images === undefined) {
    return (
      <Flex justify="center" align="center" className="min-h-[50vh]">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (images.length === 0) {
    return (
      <Box className="text-center py-16">
        <Text size="4" color="gray">
          {searchTerm ? "No images found for your search." : "No images available."}
        </Text>
      </Box>
    );
  }

  // Group images by projectName for project-rows view
  const groupedImages = viewMode === "project-rows" && images.some(img => img.projectName) 
    ? images.reduce((acc, image) => {
        const key = image.projectName || "Ungrouped";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(image);
        return acc;
      }, {} as Record<string, typeof images>)
    : null;

  return (
    <>
      {/* View mode toggle */}
      <Flex justify="end" align="center" gap="3" className="mb-4">
        <Text size="2" color="gray">View:</Text>
        <Button
          variant={viewMode === "random" ? "solid" : "soft"}
          size="1"
          onClick={() => setViewMode("random")}
        >
          Random
        </Button>
        {images.some(img => img.projectName) && (
          <Button
            variant={viewMode === "project-rows" ? "solid" : "soft"}
            size="1"
            onClick={() => setViewMode("project-rows")}
          >
            Project Rows
          </Button>
        )}
        <Button
          variant={viewMode === "list" ? "solid" : "soft"}
          size="1"
          onClick={() => setViewMode("list")}
        >
          List
        </Button>
      </Flex>

      {viewMode === "list" ? (
        // Simple list view - no metadata clutter
        <Box className="space-y-1">
          {images.map((image) => (
            <Box
              key={image._id}
              className="group cursor-pointer transition-all duration-200 p-2 hover:bg-gray-3"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTriggerPosition({
                  x: rect.left,
                  y: rect.top
                });
                setSelectedImage(image._id);
              }}
            >
              <Flex gap="3" align="center">
                {/* Thumbnail */}
                <Box className="relative overflow-hidden aspect-video bg-gray-900 flex-shrink-0" style={{ width: '100px' }}>
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </Box>
                
                {/* Title only */}
                <Text size="2" weight="medium" className="flex-1 line-clamp-1">
                  {image.title}
                </Text>
                
                {/* Actions */}
                <Flex gap="1" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <IconButton
                    variant="soft"
                    color={image.isLiked ? "red" : "gray"}
                    size="1"
                    aria-label={image.isLiked ? "Unlike this image" : "Like this image"}
                    onClick={(e) => { void handleLike(image._id, e); }}
                  >
                    <HeartIcon />
                  </IconButton>
                  <IconButton
                    variant="soft"
                    color="blue"
                    size="1"
                    aria-label="Save to board"
                    onClick={(e) => { void handleQuickSave(image._id, e); }}
                  >
                    <BookmarkIcon />
                  </IconButton>
                </Flex>
              </Flex>
            </Box>
          ))}
        </Box>
      ) : viewMode === "project-rows" && groupedImages ? (
        // Project Rows view - ShotDeck style
        <Box className="space-y-6">
          {Object.entries(groupedImages)
            .sort(([a], [b]) => a === "Ungrouped" ? 1 : b === "Ungrouped" ? -1 : a.localeCompare(b))
            .map(([projectName, projectImages]) => {
              const firstImage = projectImages[0];
              return (
                <Box key={projectName} className="space-y-2">
                  {/* Group header - ShotDeck style */}
                  <Flex align="baseline" gap="2" wrap="wrap">
                    <Text size="4" weight="bold">{projectName}</Text>
                    {firstImage?.group && (
                      <>
                        <Text size="2" color="gray">-</Text>
                        <Badge variant="soft" color="blue" size="1">
                          {firstImage.group}
                        </Badge>
                      </>
                    )}
                    <Text size="2" color="gray">
                      ({projectImages.length} {projectImages.length === 1 ? "shot" : "shots"})
                    </Text>
                  </Flex>
                  
                  {/* Horizontal scrolling row */}
                  <Box className="overflow-x-auto -mx-4 px-4">
                    <Flex gap="2" className="min-w-max pb-2">
                      {projectImages.map((image) => (
                        <Box
                          key={image._id}
                          className="group cursor-pointer transition-all duration-200 flex-shrink-0"
                          style={{ width: '180px' }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTriggerPosition({
                              x: rect.left,
                              y: rect.top
                            });
                            setSelectedImage(image._id);
                          }}
                        >
                          <Box className="relative overflow-hidden aspect-video bg-gray-900">
                            <img
                              src={image.imageUrl}
                              alt={image.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            
                            {/* Subtle overlay on hover */}
                            <Box className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                              <Flex gap="1" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <IconButton
                                  variant="soft"
                                  color={image.isLiked ? "red" : "gray"}
                                  size="1"
                                  aria-label={image.isLiked ? "Unlike this image" : "Like this image"}
                                  onClick={(e) => { void handleLike(image._id, e); }}
                                  className="backdrop-blur-md"
                                  style={{ opacity: 0.85 }}
                                >
                                  <HeartIcon />
                                </IconButton>
                                <IconButton
                                  variant="soft"
                                  color="blue"
                                  size="1"
                                  aria-label="Save to board"
                                  onClick={(e) => { void handleQuickSave(image._id, e); }}
                                  className="backdrop-blur-md"
                                  style={{ opacity: 0.85 }}
                                >
                                  <BookmarkIcon />
                                </IconButton>
                              </Flex>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                </Box>
              );
            })}
        </Box>
      ) : (
        // Ungrouped view (original)
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
          {images.map((image) => (
          <Box
            key={image._id}
            className="break-inside-avoid group cursor-pointer transition-all duration-200"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTriggerPosition({
                x: rect.left,
                y: rect.top
              });
              setSelectedImage(image._id);
            }}
          >
            <Box className="relative overflow-hidden aspect-video bg-gray-900">
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Subtle overlay on hover */}
              <Box className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                <Flex gap="1" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <IconButton
                    variant="soft"
                    color={image.isLiked ? "red" : "gray"}
                    size="2"
                    aria-label={image.isLiked ? "Unlike this image" : "Like this image"}
                    onClick={(e) => { void handleLike(image._id, e); }}
                    className="backdrop-blur-md"
                    style={{ opacity: 0.85 }}
                  >
                    <HeartIcon />
                  </IconButton>
                  <IconButton
                    variant="soft"
                    color="blue"
                    size="2"
                    aria-label="Save to board"
                    onClick={(e) => { void handleQuickSave(image._id, e); }}
                    className="backdrop-blur-md"
                    style={{ opacity: 0.85 }}
                  >
                    <BookmarkIcon />
                  </IconButton>
                </Flex>
                
                <Box className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Text size="2" weight="medium" className="text-gray-11 mb-1 line-clamp-2">
                    {image.title}
                  </Text>
                  <Flex gap="3" align="center">
                    <Flex gap="1" align="center">
                      <HeartIcon width="12" height="12" className="text-gray-10" />
                      <Text size="1" color="gray">{image.likes}</Text>
                    </Flex>
                    <Flex gap="1" align="center">
                      <EyeOpenIcon width="12" height="12" className="text-gray-10" />
                      <Text size="1" color="gray">{image.views}</Text>
                    </Flex>
                  </Flex>
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
        </div>
      )}

      {selectedImage && (
        <ImageModal
          imageId={selectedImage}
          onClose={() => {
            setSelectedImage(null);
            setTriggerPosition(undefined);
          }}
          triggerPosition={triggerPosition}
          setActiveTab={setActiveTab}
          incrementBoardVersion={incrementBoardVersion}
        />
      )}
    </>
  );
}
