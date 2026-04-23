import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Card,
  Text,
  Flex,
  Box,
  TextField,
  Button,
  Badge,
  IconButton,
  Table,
  DropdownMenu,
} from "@radix-ui/themes";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  Pencil1Icon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { ImageModal } from "./ImageModal";
import { EditImageModal } from "./EditImageModal";
import { GenerateVariationsModal } from "./GenerateVariationsModal";
import { Badge as ShadBadge } from "@/components/ui/badge";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  compactImageTagClass,
  getPaletteTagStyle,
  getPaletteSwatchStyle,
  sortColorsDarkToLight,
} from "../lib/utils";
import { SmartImage } from "./SmartImage";
import {
  ACCENT_BADGE_CLASS,
  CODE_BADGE_CLASS,
  ICON_BUTTON_ACTIVE_CLASS,
  NEUTRAL_BADGE_CLASS,
  PAGE_BUTTON_CLASS,
  PILL_BUTTON_ACTIVE_CLASS,
  PILL_BUTTON_CLASS,
} from "@/components/ui/actionStyles";

interface Image {
  _id: Id<"images">;
  title: string;
  description?: string;
  imageUrl: string;
  tags: string[];
  category: string;
  source?: string;
  sref?: string;
  colors?: string[];
  uploadedBy: Id<"users">;
  likes: number;
  views: number;
  isLiked: boolean;
  uploadedAt?: number;
  parentImageId?: Id<"images">;
}

export function TableView() {
  const images = useQuery(api.images.list, { limit: 1000 });
  const deleteImage = useMutation(api.images.remove);
  const generateOutput = useMutation(api.generations.generate);
  const [selectedImage, setSelectedImage] = useState<Id<"images"> | null>(null);
  const [editingImage, setEditingImage] = useState<Id<"images"> | null>(null);
  const [variationsModalImageId, setVariationsModalImageId] = useState<Id<"images"> | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showOnlyOriginals, setShowOnlyOriginals] = useState(false);
  const [showOnlySref, setShowOnlySref] = useState(false);

  const compactPillClass =
    "h-6 rounded-sm px-2 text-[11px] font-medium tracking-[0.01em]";

  // Extract unique tags and colors for filters
  const allTags = useMemo(() => {
    if (!images) return [];
    const tagSet = new Set<string>();
    images.forEach(image => {
      image.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [images]);

  const allColors = useMemo(() => {
    if (!images) return [];
    const colorSet = new Set<string>();
    images.forEach(image => {
      if (image.colors) {
        image.colors.forEach(color => colorSet.add(color));
      }
    });
    return Array.from(colorSet).sort();
  }, [images]);

  // Listen for custom events to open image modals (for parent image navigation)
  useEffect(() => {
    const handleOpenImageModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageId: Id<"images"> }>;
      setSelectedImage(customEvent.detail.imageId);
    };

    window.addEventListener('open-image-modal', handleOpenImageModal);
    return () => window.removeEventListener('open-image-modal', handleOpenImageModal);
  }, []);

  const handleDeleteImage = useCallback(async (imageId: Id<"images">, imageTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${imageTitle}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteImage({ id: imageId });
      toast.success(`"${imageTitle}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image.');
    }
  }, [deleteImage]);

  const handleGenerate = useCallback(async (imageId: Id<"images">, type: "storyboard" | "deck") => {
    try {
      const result = await generateOutput({ imageId, type });
      toast.success(`${result.templateName} created`);
    } catch (error) {
      console.error("Failed to generate output:", error);
      toast.error("Failed to generate output");
    }
  }, [generateOutput]);

  const columns = useMemo<ColumnDef<Image>[]>(
    () => [
      {
        accessorKey: "imageUrl",
        header: "Image",
        cell: ({ row }) => (
          <Box className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
            <SmartImage
              image={row.original}
              variant="dense"
              alt={row.original.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </Box>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "_id",
        header: "ID",
        cell: ({ row }) => (
          <Text size="1" color="gray" className="font-mono">
            {row.original._id.slice(-8)}
          </Text>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Text size="2" weight="medium">
            {row.getValue("title")}
          </Text>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge variant="soft" color="gray" size="1">
            {row.getValue("category")}
          </Badge>
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const tags = row.original.tags ?? [];
          const palette = row.original.colors ?? [];
          return (
            <Flex gap="2" wrap="wrap">
              {tags.slice(0, 3).map((tag, index) => (
                <ShadBadge
                  key={tag}
                  variant="outline"
                  className={`${compactImageTagClass} border-0`}
                  style={getPaletteTagStyle(palette, index, Math.min(tags.length, 3))}
                >
                  {tag}
                </ShadBadge>
              ))}
              {tags.length > 3 && (
                <ShadBadge
                  variant="outline"
                  className={`${compactImageTagClass} border-0 bg-white/[0.06] text-white/60`}
                >
                  +{tags.length - 3}
                </ShadBadge>
              )}
            </Flex>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "sref",
        header: "Sref",
        cell: ({ row }) => {
          const sref = row.original.sref;
          return sref ? (
            <Badge variant="soft" color="gray" size="1" className={CODE_BADGE_CLASS}>
              {sref}
            </Badge>
          ) : (
            <Text size="1" color="gray">-</Text>
          );
        },
      },
      {
        accessorKey: "colors",
        header: "Colors",
        cell: ({ row }) => {
          const colors = row.original.colors ?? [];
          if (!colors || colors.length === 0) {
            return <Text size="1" color="gray">-</Text>;
          }
          // Sort colors dark to light for aesthetic gradient display
          const sortedColors = sortColorsDarkToLight(colors);
          return (
            <Flex gap="1">
              {sortedColors.map((color, index) => (
                <Box
                  key={index}
                  className="w-4 h-4 rounded border"
                  style={getPaletteSwatchStyle(color)}
                  title={color}
                />
              ))}
            </Flex>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "parentImageId",
        header: "Parent",
        cell: ({ row }) => {
          const parentId = row.original.parentImageId;
          if (!parentId) {
            return (
              <Badge variant="soft" color="gray" size="1" className={NEUTRAL_BADGE_CLASS}>
                  Original
              </Badge>
            );
          }
          // Find parent image from the list
          const parentImage = images?.find(img => img._id === parentId);
          return parentImage ? (
            <Flex gap="1" align="center" wrap="wrap" className="min-w-0">
              <Button
                variant="soft"
                color="gray"
                size="1"
                className={`${PILL_BUTTON_CLASS} h-6 max-w-[10rem] rounded-sm px-2 text-[11px]`}
                onClick={() => setSelectedImage(parentId)}
              >
                {parentImage.title.substring(0, 20)}{parentImage.title.length > 20 ? '...' : ''}
              </Button>
            </Flex>
          ) : (
            <Badge variant="soft" color="gray" size="1" className={NEUTRAL_BADGE_CLASS}>
              Derived
            </Badge>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "likes",
        header: "Likes",
        cell: ({ row }) => (
          <Text size="2">{row.getValue("likes")}</Text>
        ),
      },
      {
        accessorKey: "views",
        header: "Views",
        cell: ({ row }) => (
          <Text size="2">{row.getValue("views")}</Text>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => {
          const source = row.original.source;
          return source ? (
            <Button variant="soft" color="gray" size="1" className={PILL_BUTTON_ACTIVE_CLASS} asChild style={{ opacity: 0.9 }}>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
              >
                Link
              </a>
            </Button>
          ) : (
            <Text size="1" color="gray">-</Text>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "uploadedAt",
        header: "Date Uploaded",
        cell: ({ row }) => {
          const timestamp = row.original.uploadedAt;
          return timestamp ? (
            <Text size="2">
              {new Date(timestamp).toLocaleDateString()}
            </Text>
          ) : (
            <Text size="2" color="gray">-</Text>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Flex gap="1">
            <Button
              variant="soft"
              color="gray"
              size="1"
              className={PILL_BUTTON_ACTIVE_CLASS}
              onClick={() => setSelectedImage(row.original._id)}
              style={{ opacity: 0.9 }}
            >
              View
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton
                  variant="soft"
                  color="gray"
                  size="1"
                  className={ICON_BUTTON_ACTIVE_CLASS}
                  title="Generate"
                  style={{ opacity: 0.9 }}
                >
                  <MagicWandIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => setVariationsModalImageId(row.original._id)}>
                  Variations
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => void handleGenerate(row.original._id, "storyboard")}>
                  Storyboard
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => void handleGenerate(row.original._id, "deck")}>
                  Deck
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <IconButton
              variant="soft"
              color="gray"
              size="1"
              className={ICON_BUTTON_ACTIVE_CLASS}
              onClick={() => setEditingImage(row.original._id)}
              title="Edit image"
              style={{ opacity: 0.9 }}
            >
              <Pencil1Icon />
            </IconButton>
            <IconButton
              variant="soft"
              color="red"
              size="1"
              onClick={() => void handleDeleteImage(row.original._id, row.original.title)}
              title="Delete image"
              style={{ opacity: 0.9 }}
            >
              <TrashIcon />
            </IconButton>
          </Flex>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
    ],
    [images, handleDeleteImage, handleGenerate]
  );

  // Filter images based on selected tags, colors, and original filter
  const filteredImages = useMemo(() => {
    if (!images) return [];
    
    return images.filter(image => {
      // Original images filter (show only images without parentImageId or with "original" tag)
      if (showOnlyOriginals) {
        const isOriginal = !image.parentImageId || image.tags.includes("original");
        if (!isOriginal) return false;
      }

      // Sref filter (show only images with sref field or sref:* tag)
      if (showOnlySref) {
        const hasSrefField = Boolean(image.sref && String(image.sref).trim().length > 0);
        const hasSrefTag = image.tags.some((tag) =>
          String(tag).toLowerCase().startsWith("sref:")
        );
        if (!hasSrefField && !hasSrefTag) return false;
      }
      
      // Tag filter
      if (selectedTags.length > 0) {
        const hasSelectedTag = selectedTags.some(tag => image.tags.includes(tag));
        if (!hasSelectedTag) return false;
      }
      
      // Color filter
      if (selectedColors.length > 0) {
        const hasSelectedColor = selectedColors.some(color => 
          image.colors && image.colors.includes(color)
        );
        if (!hasSelectedColor) return false;
      }
      
      return true;
    });
  }, [images, selectedTags, selectedColors, showOnlyOriginals, showOnlySref]);

  const table = useReactTable({
    data: filteredImages,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (!images) {
    return (
      <Box className="flex justify-center items-center min-h-[50vh]">
        <Text color="gray">Loading table...</Text>
      </Box>
    );
  }

  return (
    <Box className="space-y-4 w-full">
      <Box>
        <Text size="6" weight="bold">Image Table</Text>
        <Text size="2" color="gray" className="mt-1">
          Searchable and sortable table view of all images
        </Text>
      </Box>

      {/* Search and Filters */}
      <Card>
        <Box className="p-4">
          <Flex gap="4" align="center" className="mb-4">
            <Box className="flex-1">
              <TextField.Root
                placeholder="Search all columns..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                size="2"
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Text size="2" color="gray">
              {table.getFilteredRowModel().rows.length} of {images.length} images
            </Text>
          </Flex>

          {/* Original Images Filter */}
          <Box className="mb-4">
            <Flex gap="2" align="center">
              <Text size="2" weight="medium" className="text-[13px]">Show Only Original Images:</Text>
              <Button
                variant="soft"
                color="gray"
                size="1"
                className={showOnlyOriginals ? `${compactPillClass} ${PILL_BUTTON_ACTIVE_CLASS}` : `${compactPillClass} ${PILL_BUTTON_CLASS}`}
                onClick={() => setShowOnlyOriginals(!showOnlyOriginals)}
              >
                {showOnlyOriginals ? 'On' : 'Off'}
              </Button>
              <Text size="2" weight="medium" className="ml-4 text-[13px]">Show Sref Only:</Text>
              <Button
                variant="soft"
                color="gray"
                size="1"
                className={showOnlySref ? `${compactPillClass} ${PILL_BUTTON_ACTIVE_CLASS}` : `${compactPillClass} ${PILL_BUTTON_CLASS}`}
                onClick={() => setShowOnlySref(!showOnlySref)}
              >
                {showOnlySref ? 'On' : 'Off'}
              </Button>
            </Flex>
          </Box>

          {/* Tag Filters */}
          <Box className="mb-4">
            <Text size="2" weight="medium" className="mb-2 text-[13px]">Filter by Tags:</Text>
            <Flex gap="1" wrap="wrap">
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant="soft"
                  color="gray"
                  size="1"
                  className={selectedTags.includes(tag) ? `${compactPillClass} ${PILL_BUTTON_ACTIVE_CLASS}` : `${compactPillClass} ${PILL_BUTTON_CLASS}`}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  {tag}
                </Button>
              ))}
              {selectedTags.length > 0 && (
                <Button
                  variant="soft"
                  color="red"
                  size="1"
                  className={compactPillClass}
                  onClick={() => setSelectedTags([])}
                >
                  Clear
                </Button>
              )}
            </Flex>
          </Box>

          {/* Color Filters */}
          <Box className="mb-4">
            <Text size="2" weight="medium" className="mb-2 text-[13px]">Filter by Colors:</Text>
            <Flex gap="1" wrap="wrap">
              {allColors.map((color) => (
                <Button
                  key={color}
                  variant="soft"
                  color="gray"
                  size="1"
                  className={selectedColors.includes(color) ? `${compactPillClass} ${PILL_BUTTON_ACTIVE_CLASS}` : `${compactPillClass} ${PILL_BUTTON_CLASS}`}
                  onClick={() => {
                    setSelectedColors(prev => 
                      prev.includes(color) 
                        ? prev.filter(c => c !== color)
                        : [...prev, color]
                    );
                  }}
                >
                  <Box
                    className="mr-1 h-3 w-3 rounded-[2px] border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                </Button>
              ))}
              {selectedColors.length > 0 && (
                <Button
                  variant="soft"
                  color="red"
                  size="1"
                  className={compactPillClass}
                  onClick={() => setSelectedColors([])}
                >
                  Clear
                </Button>
              )}
            </Flex>
          </Box>

          {/* Column Filters */}
          <Flex gap="2" wrap="wrap">
            {table.getHeaderGroups()[0]?.headers
              .filter((header) => header.column.getCanFilter())
              .map((header) => (
                <Box key={header.id}>
                  <TextField.Root
                    placeholder={`Filter ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.id}...`}
                    value={(header.column.getFilterValue() as string) ?? ""}
                    onChange={(e) =>
                      header.column.setFilterValue(e.target.value)
                    }
                    size="1"
                  />
                </Box>
              ))}
          </Flex>
        </Box>
      </Card>

      {/* Table */}
      <Card>
        <Box className="overflow-x-auto w-full min-w-0">
          <Table.Root className="w-full">
            <Table.Header>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.ColumnHeaderCell key={header.id}>
                      <Flex align="center" gap="2">
                        <Box
                          className={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <Flex align="center" gap="1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <>
                                {header.column.getIsSorted() === "desc" ? (
                                  <ArrowDownIcon width="12" height="12" />
                                ) : header.column.getIsSorted() === "asc" ? (
                                  <ArrowUpIcon width="12" height="12" />
                                ) : (
                                  <Box className="w-3 h-3" />
                                )}
                              </>
                            )}
                          </Flex>
                        </Box>
                      </Flex>
                    </Table.ColumnHeaderCell>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            <Table.Body>
              {table.getRowModel().rows.map((row) => (
                <Table.Row key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>

      {/* Pagination */}
      <Card>
        <Box className="p-4">
          <Flex justify="between" align="center">
            <Text size="2" color="gray">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </Text>
            <Flex gap="2">
              <IconButton
                variant="soft"
                color="gray"
                size="1"
                className={PAGE_BUTTON_CLASS}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                style={{ opacity: table.getCanPreviousPage() ? 0.9 : 0.5 }}
              >
                <DoubleArrowLeftIcon />
              </IconButton>
              <IconButton
                variant="soft"
                color="gray"
                size="1"
                className={PAGE_BUTTON_CLASS}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                style={{ opacity: table.getCanPreviousPage() ? 0.9 : 0.5 }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                variant="soft"
                color="gray"
                size="1"
                className={PAGE_BUTTON_CLASS}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                style={{ opacity: table.getCanNextPage() ? 0.9 : 0.5 }}
              >
                <ChevronRightIcon />
              </IconButton>
              <IconButton
                variant="soft"
                color="gray"
                size="1"
                className={PAGE_BUTTON_CLASS}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                style={{ opacity: table.getCanNextPage() ? 0.9 : 0.5 }}
              >
                <DoubleArrowRightIcon />
              </IconButton>
            </Flex>
          </Flex>
        </Box>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          imageId={selectedImage}
          onClose={() => setSelectedImage(null)}
          setActiveTab={() => {}}
          incrementBoardVersion={() => {}}
        />
      )}

      {/* Edit Image Modal */}
      {editingImage && (
        <EditImageModal
          imageId={editingImage}
          open={!!editingImage}
          onOpenChange={(open) => !open && setEditingImage(null)}
        />
      )}

      {/* Generate Variations Modal */}
      {variationsModalImageId && (
        <GenerateVariationsModal
          imageId={variationsModalImageId}
          open={true}
          onOpenChange={(open) => { if (!open) setVariationsModalImageId(null); }}
        />
      )}
    </Box>
  );
}
