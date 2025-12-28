import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { ImageGrid } from "./components/ImageGrid";
import { ImageUploadForm } from "./components/ImageUploadForm";
import { BoardsView } from "./components/BoardsView";
import { TableView } from "./components/TableView";
import { Header } from "./components/Header";
import { Box, Text, Flex, Spinner } from "@radix-ui/themes";
import { useState, useEffect } from "react";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("gallery");

  useEffect(() => {
    console.log("🔐 Auth State - isAuthenticated:", isAuthenticated);
    console.log("🔐 Auth State - isLoading:", isLoading);
  }, [isAuthenticated, isLoading]);

  return (
    <Box className="min-h-screen">
      <Header
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Box as="main" className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <Flex justify="center" align="center" className="min-h-[50vh]">
            <Spinner size="3" />
          </Flex>
        ) : (
          <>
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
              {activeTab === "gallery" && (
                <ImageGrid
                  searchTerm={searchTerm}
                  selectedCategory={selectedCategory}
                />
              )}
              {activeTab === "upload" && <ImageUploadForm />}
              {activeTab === "boards" && <BoardsView />}
              {activeTab === "table" && <TableView />}
            </Authenticated>
          </>
        )}
      </Box>
      
      <Toaster theme="dark" />
    </Box>
  );
}
