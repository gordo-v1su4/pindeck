import { Authenticated } from "convex/react";
import { SearchBar } from "./SearchBar";
import { SignOutButton } from "../SignOutButton";
import { CategoryFilter } from "./CategoryFilter";
import { ImageUploadForm } from "./ImageUploadForm";
import { BoardsView } from "./BoardsView";
import { TableView } from "./TableView";
import { Box, Text, Flex, Tabs } from "@radix-ui/themes";
import { GridIcon } from "@radix-ui/react-icons";

interface HeaderProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  selectedCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({
  onSearch,
  selectedCategory,
  onCategoryChange,
  activeTab,
  onTabChange,
}: HeaderProps) {
  return (
    <Box as="header" className="sticky top-0 z-50 border-b border-gray-6 backdrop-blur-sm">
      <Box className="max-w-7xl mx-auto px-4 py-4">
        <Flex justify="between" align="center">
          <Flex align="center" gap="6">
            <Text size="6" weight="bold">Visuals</Text>
            <Authenticated>
              <Box className="hidden md:block">
                <SearchBar onSearch={onSearch} />
              </Box>
            </Authenticated>
          </Flex>
          <Flex align="center" gap="4">
            <Authenticated>
              <SignOutButton />
            </Authenticated>
          </Flex>
        </Flex>
        <Authenticated>
          <Box className="mt-4">
            <Tabs.Root value={activeTab} onValueChange={onTabChange}>
              <Tabs.List>
                <Tabs.Trigger value="gallery">Gallery</Tabs.Trigger>
                <Tabs.Trigger value="upload">Upload</Tabs.Trigger>
                <Tabs.Trigger value="boards">Boards</Tabs.Trigger>
                <Tabs.Trigger value="table">
                  <Flex align="center" gap="2">
                    <GridIcon width="16" height="16" />
                    Table
                  </Flex>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </Box>
          <Box className="mt-4 md:hidden">
            <SearchBar onSearch={onSearch} />
          </Box>
          {activeTab === "gallery" && (
            <Box className="mt-4">
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
              />
            </Box>
          )}
        </Authenticated>
      </Box>
    </Box>
  );
}