import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ImageGrid } from "./components/ImageGrid";
import { SearchBar } from "./components/SearchBar";
import { CategoryFilter } from "./components/CategoryFilter";
import { ImageUploadForm } from "./components/ImageUploadForm";
import { BoardsView } from "./components/BoardsView";
import { TableView } from "./components/TableView";
import { Box, Text, Flex, Spinner, Button, Tabs } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { ImageIcon, UploadIcon, BookmarkIcon, GridIcon } from "@radix-ui/react-icons";

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("gallery");

  // Debug log
  console.log("Active tab:", activeTab);

  return (
    <Box className="min-h-screen">
      <Box as="header" className="sticky top-0 z-50 border-b border-gray-6 backdrop-blur-sm">
        <Box className="max-w-7xl mx-auto px-4 py-4">
          <Flex justify="between" align="center">
            <Flex align="center" gap="6">
              <Text size="6" weight="bold">Visuals</Text>
              <Authenticated>
                <SearchBar onSearch={setSearchTerm} />
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
              <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List>
                  <Tabs.Trigger value="gallery">Gallery</Tabs.Trigger>
                  <Tabs.Trigger value="upload">Upload</Tabs.Trigger>
                  <Tabs.Trigger value="boards">Boards</Tabs.Trigger>
                  <Tabs.Trigger value="table">
                    <GridIcon width="16" height="16" />
                    Table
                  </Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>
            </Box>
            {activeTab === "gallery" && (
              <Box className="mt-4">
                <CategoryFilter 
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              </Box>
            )}
          </Authenticated>
        </Box>
      </Box>

      <Box as="main" className="max-w-7xl mx-auto px-4 py-8">
        <Authenticated>
          {activeTab === "gallery" && (
            <Content 
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
            />
          )}
          {activeTab === "upload" && <ImageUploadForm />}
          {activeTab === "boards" && <BoardsView />}
          {activeTab === "table" && <TableView />}
        </Authenticated>
        <Unauthenticated>
          <Content 
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
          />
        </Unauthenticated>
      </Box>
      
      <Toaster theme="dark" />
    </Box>
  );
}

function Content({ searchTerm, selectedCategory }: { 
  searchTerm: string; 
  selectedCategory: string | undefined;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  useEffect(() => {
    console.log("🔐 Auth State - isAuthenticated:", isAuthenticated);
    console.log("🔐 Auth State - isLoading:", isLoading);
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <Flex justify="center" align="center" className="min-h-[50vh]">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box className="space-y-8">
      <Unauthenticated>
        <Box className="text-center space-y-6 py-16">
          <Text size="8" weight="bold" className="mb-4">
            Discover Visual Inspiration
          </Text>
          <Text size="4" color="gray" className="max-w-2xl mx-auto">
            A curated collection of visual references, design inspiration, and creative shots
          </Text>
          <Box className="max-w-md mx-auto">
            <SignInForm />
          </Box>
        </Box>
      </Unauthenticated>

      <Authenticated>
        <ImageGrid 
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
        />
      </Authenticated>
    </Box>
  );
}
