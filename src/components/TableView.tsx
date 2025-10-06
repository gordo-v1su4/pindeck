import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo, useEffect } from "react";
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
} from "@radix-ui/themes";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { ImageModal } from "./ImageModal";
import { Id } from "../../convex/_generated/dataModel";

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
}

export function TableView() {
  const images = useQuery(api.images.list, { limit: 1000 });
  const [selectedImage, setSelectedImage] = useState<Id<"images"> | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

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

  const columns = useMemo<ColumnDef<Image>[]>(
    () => [
      {
        accessorKey: "imageUrl",
        header: "Image",
        cell: ({ row }) => (
          <Box className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
            <img
              src={row.getValue("imageUrl")}
              alt={row.original.title}
              className="w-full h-full object-cover"
            />
          </Box>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
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
          const tags = row.getValue("tags") as string[];
          return (
            <Flex gap="1" wrap="wrap">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="soft" color="blue" size="1">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="soft" color="gray" size="1">
                  +{tags.length - 3}
                </Badge>
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
          const sref = row.getValue("sref") as string;
          return sref ? (
            <Badge variant="soft" color="purple" size="1">
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
          const colors = row.getValue("colors") as string[];
          return colors && colors.length > 0 ? (
            <Flex gap="1">
              {colors.slice(0, 3).map((color, index) => (
                <Box
                  key={index}
                  className="w-4 h-4 rounded border border-gray-6"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {colors.length > 3 && (
                <Text size="1" color="gray">+{colors.length - 3}</Text>
              )}
            </Flex>
          ) : (
            <Text size="1" color="gray">-</Text>
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
          const source = row.getValue("source") as string;
          return source ? (
            <Button variant="ghost" size="1" asChild>
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
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="soft"
            size="1"
            onClick={() => setSelectedImage(row.original._id)}
          >
            View
          </Button>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
    ],
    []
  );

  // Filter images based on selected tags and colors
  const filteredImages = useMemo(() => {
    if (!images) return [];
    
    return images.filter(image => {
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
  }, [images, selectedTags, selectedColors]);

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
    <Box className="space-y-4">
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

          {/* Tag Filters */}
          <Box className="mb-4">
            <Text size="2" weight="medium" className="mb-2">Filter by Tags:</Text>
            <Flex gap="1" wrap="wrap">
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "solid" : "soft"}
                  color={selectedTags.includes(tag) ? "blue" : "gray"}
                  size="1"
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
                  variant="ghost"
                  size="1"
                  onClick={() => setSelectedTags([])}
                >
                  Clear
                </Button>
              )}
            </Flex>
          </Box>

          {/* Color Filters */}
          <Box className="mb-4">
            <Text size="2" weight="medium" className="mb-2">Filter by Colors:</Text>
            <Flex gap="1" wrap="wrap">
              {allColors.map((color) => (
                <Button
                  key={color}
                  variant={selectedColors.includes(color) ? "solid" : "soft"}
                  color="gray"
                  size="1"
                  onClick={() => {
                    setSelectedColors(prev => 
                      prev.includes(color) 
                        ? prev.filter(c => c !== color)
                        : [...prev, color]
                    );
                  }}
                  style={{
                    backgroundColor: selectedColors.includes(color) ? color : undefined,
                    color: selectedColors.includes(color) ? 
                      (color === '#FFFFFF' || color === '#ffffff' ? '#000000' : '#FFFFFF') : undefined
                  }}
                >
                  <Box
                    className="w-3 h-3 rounded border border-gray-6 mr-1"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                </Button>
              ))}
              {selectedColors.length > 0 && (
                <Button
                  variant="ghost"
                  size="1"
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
                    placeholder={`Filter ${header.column.columnDef.header}...`}
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
        <Box className="overflow-x-auto">
          <Table.Root>
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
                size="1"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <DoubleArrowLeftIcon />
              </IconButton>
              <IconButton
                variant="soft"
                size="1"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                variant="soft"
                size="1"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon />
              </IconButton>
              <IconButton
                variant="soft"
                size="1"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
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
        />
      )}
    </Box>
  );
}
