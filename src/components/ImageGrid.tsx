import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { ImageModal } from "./ImageModal";
import { HeartIcon, HeartFilledIcon, EyeOpenIcon, BookmarkIcon, BookmarkFilledIcon, MagicWandIcon, PlusIcon, DragHandleDots2Icon } from "@radix-ui/react-icons";
import { IconButton, Text, Flex, Box, Spinner, Button, Badge, DropdownMenu } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { CreateBoardModal } from "./CreateBoardModal";
import { GenerateVariationsModal } from "./GenerateVariationsModal";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

interface ImageGridProps {
  searchTerm: string;
  selectedGroup: string | undefined;
  selectedCategory: string | undefined;
  selectedSref: string | undefined;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}

function DroppableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? "ring-2 ring-blue-9 rounded-lg" : ""}>
      {children}
    </div>
  );
}

function DraggableCard({
  id,
  children,
}: {
  id: Id<"images">;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id as string,
    data: { id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex-shrink-0 ${isDragging ? "opacity-50 z-10" : ""}`}
      style={{ width: "180px" }}
    >
      {children}
    </div>
  );
}

type ViewMode = "random" | "project-rows";

export function ImageGrid({ searchTerm, selectedGroup, selectedCategory, selectedSref, setActiveTab, incrementBoardVersion }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<Id<"images"> | null>(null);
  const [triggerPosition, setTriggerPosition] = useState<{ x: number; y: number } | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("random");
  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [createBoardImageId, setCreateBoardImageId] = useState<Id<"images"> | null>(null);
  const [variationsModalImageId, setVariationsModalImageId] = useState<Id<"images"> | null>(null);
  const boards = useQuery(api.boards.list);
  const addImageToBoard = useMutation(api.boards.addImage);
  const generateOutput = useMutation(api.generations.generate);
  
  const images = useQuery(
    searchTerm 
      ? api.images.search 
      : api.images.list,
    searchTerm 
      ? { searchTerm, category: selectedCategory, group: selectedGroup }
      : { category: selectedCategory, group: selectedGroup }
  );

  const toggleLike = useMutation(api.images.toggleLike);
  const setProjectRowOrder = useMutation(api.images.setProjectRowOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const srefFilteredImages = useMemo(() => {
    if (!images) return images;
    if (!selectedSref) return images;
    return images.filter((image) => image.sref === selectedSref);
  }, [images, selectedSref]);

  // Shuffle images for random view - use a seeded shuffle based on date so it's consistent per session
  const shuffledImages = useMemo(() => {
    if (!srefFilteredImages || viewMode !== "random") return srefFilteredImages;
    // Fisher-Yates shuffle with a seed based on session start
    const arr = [...srefFilteredImages];
    const seed = Math.floor(Date.now() / (1000 * 60 * 60)); // Changes every hour
    let m = arr.length;
    let t, i;
    let s = seed;
    while (m) {
      s = (s * 9301 + 49297) % 233280;
      i = Math.floor((s / 233280) * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  }, [srefFilteredImages, viewMode]);

  // Listen for custom events to open image modals (for parent image navigation)
  useEffect(() => {
    const handleOpenImageModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageId: Id<"images"> }>;
      setSelectedImage(customEvent.detail.imageId);
      setTriggerPosition(undefined); // Center the modal when navigating programmatically
    };

    window.addEventListener('open-image-modal', handleOpenImageModal);
    return () => window.removeEventListener('open-image-modal', handleOpenImageModal);
  }, []);

  const handleLike = async (imageId: Id<"images">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike({ imageId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleQuickSave = async (boardId: Id<"collections">, imageId: Id<"images">) => {
    try {
      await addImageToBoard({ boardId, imageId });
      toast.success("Image saved to board!");
    } catch (error: any) {
      if (error.message?.includes("already in board")) {
        toast.error("Image is already in this board");
      } else {
        toast.error("Failed to save to board");
      }
    }
  };

  const handleGenerate = async (
    imageId: Id<"images">,
    type: "storyboard" | "deck",
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    try {
      const result = await generateOutput({ imageId, type });
      toast.success(`${result.templateName} created`);
    } catch (error) {
      console.error("Failed to generate output:", error);
      toast.error("Failed to generate output");
    }
  };

  const renderGenerateMenu = (imageId: Id<"images">, size: "1" | "2") => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton
          variant="soft"
          color="teal"
          size={size}
          aria-label="Generate options"
          onClick={(event) => event.stopPropagation()}
          className="backdrop-blur-md"
          style={{ opacity: 0.85 }}
        >
          <MagicWandIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content onClick={(e) => e.stopPropagation()} className="dropdown-teal">
        <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); setVariationsModalImageId(imageId); }}>
          Variations
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={(event) => void handleGenerate(imageId, "storyboard", event)}>
          Storyboard
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={(event) => void handleGenerate(imageId, "deck", event)}>
          Deck
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );

  const renderSaveToBoardDropdown = (image: typeof images[number], size: "1" | "2") => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton
          variant="soft"
          color="blue"
          size={size}
          aria-label="Save to board"
          onClick={(e) => e.stopPropagation()}
          className="backdrop-blur-md"
          style={{ opacity: 0.85 }}
        >
          <BookmarkIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content onClick={(e) => e.stopPropagation()}>
        {boards && boards.length > 0 ? (
          <>
            {boards.map((board) => (
              <DropdownMenu.Item
                key={board._id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickSave(board._id, image._id);
                }}
              >
                {board.name}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator />
          </>
        ) : (
          <DropdownMenu.Item disabled>
            No boards yet
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation();
            setCreateBoardImageId(image._id);
            setCreateBoardModalOpen(true);
          }}
        >
          <PlusIcon width="14" height="14" />
          Create board
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );

  if (srefFilteredImages === undefined) {
    return (
      <Flex justify="center" align="center" className="min-h-[50vh]">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (srefFilteredImages.length === 0) {
    return (
      <Box className="text-center py-16">
        <Text size="4" color="gray">
          {searchTerm
            ? "No images found for your search."
            : selectedSref
              ? `No images found for sref ${selectedSref}.`
              : "No images available."}
        </Text>
      </Box>
    );
  }

  // Group images by projectName for project-rows view; sort each row by projectOrder
  const groupedImages = viewMode === "project-rows" && srefFilteredImages.some(img => img.projectName)
    ? (() => {
        const acc: Record<string, typeof srefFilteredImages> = {};
        for (const image of srefFilteredImages) {
          const key =
            image.projectName ||
            (image.sourceType === "discord" && image.title ? image.title : "Ungrouped");
          if (!acc[key]) acc[key] = [];
          acc[key].push(image);
        }
        for (const key of Object.keys(acc)) {
          acc[key].sort((a, b) => {
            const oA = (a as { projectOrder?: number }).projectOrder ?? 999;
            const oB = (b as { projectOrder?: number }).projectOrder ?? 999;
            return oA - oB;
          });
        }
        return acc;
      })()
    : null;

  const handleProjectRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !groupedImages) return;
    const draggedId = active.id as string;
    const overId = over.id as string;
    const imageIdToInfo: Record<string, { projectName: string; index: number }> = {};
    for (const [projectName, arr] of Object.entries(groupedImages)) {
      arr.forEach((img, idx) => {
        imageIdToInfo[img._id] = { projectName, index: idx };
      });
    }
    const sourceInfo = imageIdToInfo[draggedId];
    if (!sourceInfo) return;
    const sourceProjectName = sourceInfo.projectName;
    let targetProjectName: string;
    let insertIndex: number;
    if (String(overId).startsWith("row-")) {
      targetProjectName = String(overId).slice(4);
      insertIndex = groupedImages[targetProjectName]?.length ?? 0;
    } else {
      const targetInfo = imageIdToInfo[overId];
      if (!targetInfo) return;
      targetProjectName = targetInfo.projectName;
      insertIndex = targetInfo.index;
    }
    const sourceIds = groupedImages[sourceProjectName].map((i) => i._id).filter((id) => id !== draggedId);
    const targetBase = sourceProjectName === targetProjectName
      ? sourceIds
      : groupedImages[targetProjectName].map((i) => i._id);
    const targetIds = [...targetBase];
    targetIds.splice(insertIndex, 0, draggedId as Id<"images">);
    if (sourceProjectName === targetProjectName) {
      void setProjectRowOrder({ projectName: sourceProjectName, imageIds: targetIds });
    } else {
      void setProjectRowOrder({ projectName: sourceProjectName, imageIds: sourceIds });
      void setProjectRowOrder({ projectName: targetProjectName, imageIds: targetIds });
    }
    toast.success("Order saved");
  };

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
        {srefFilteredImages.some(img => img.projectName) && (
          <Button
            variant={viewMode === "project-rows" ? "solid" : "soft"}
            size="1"
            onClick={() => setViewMode("project-rows")}
          >
            Project Rows
          </Button>
        )}
      </Flex>

      {viewMode === "project-rows" && groupedImages ? (
        // Project Rows view - ShotDeck style with drag-and-drop
        <DndContext sensors={sensors} onDragEnd={handleProjectRowDragEnd}>
          <Box className="space-y-6">
            {Object.entries(groupedImages)
              .sort(([a], [b]) => a === "Ungrouped" ? 1 : b === "Ungrouped" ? -1 : a.localeCompare(b))
              .map(([projectName, projectImages]) => {
                const firstImage = projectImages[0];
                return (
                  <Box key={projectName} className="space-y-2">
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
                    <Box className="overflow-x-auto -mx-4 px-4">
                      <DroppableRow id={`row-${projectName}`}>
                        <Flex gap="2" className="min-w-max pb-2">
                          {projectImages.map((image) => (
                            <DraggableCard key={image._id} id={image._id}>
                              <Box
                                className="group cursor-pointer transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTriggerPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top + rect.height / 2
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
                                  <Flex gap="1" className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <IconButton
                                      variant="soft"
                                      color="gray"
                                      size="1"
                                      aria-label="Drag to reorder"
                                      className="backdrop-blur-md cursor-grab active:cursor-grabbing"
                                      style={{ opacity: 0.85 }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <DragHandleDots2Icon />
                                    </IconButton>
                                  </Flex>
                                  <Box className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                                    <Flex gap="1" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <IconButton
                                        variant="soft"
                                        color={image.isLiked ? "red" : "gray"}
                                        size="1"
                                        aria-label={image.isLiked ? "Unlike this image" : "Like this image"}
                                        onClick={(e) => { e.stopPropagation(); void handleLike(image._id, e); }}
                                        className="backdrop-blur-md"
                                        style={{ opacity: 0.85 }}
                                      >
                                        {image.isLiked ? <HeartFilledIcon /> : <HeartIcon />}
                                      </IconButton>
                                      {renderSaveToBoardDropdown(image, "1")}
                                      {renderGenerateMenu(image._id, "1")}
                                    </Flex>
                                  </Box>
                                </Box>
                              </Box>
                            </DraggableCard>
                          ))}
                        </Flex>
                      </DroppableRow>
                    </Box>
                  </Box>
                );
              })}
          </Box>
        </DndContext>
      ) : (
        // Ungrouped view (original) - half-size tiles: more columns = smaller images
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 space-y-2">
          {(shuffledImages || []).map((image) => (
          <Box
            key={image._id}
            className="break-inside-avoid group cursor-pointer transition-all duration-200"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTriggerPosition({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
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
                    {image.isLiked ? <HeartFilledIcon /> : <HeartIcon />}
                  </IconButton>
                  {renderSaveToBoardDropdown(image, "2")}
                  {renderGenerateMenu(image._id, "2")}
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

      <CreateBoardModal
        open={createBoardModalOpen}
        onOpenChange={(open) => {
          setCreateBoardModalOpen(open);
          if (!open) {
            setCreateBoardImageId(null);
          }
        }}
        imageId={createBoardImageId ?? undefined}
        setActiveTab={setActiveTab}
        incrementBoardVersion={incrementBoardVersion}
      />

      {variationsModalImageId && (
        <GenerateVariationsModal
          imageId={variationsModalImageId}
          open={!!variationsModalImageId}
          onOpenChange={(open) => { if (!open) setVariationsModalImageId(null); }}
        />
      )}
    </>
  );
}
