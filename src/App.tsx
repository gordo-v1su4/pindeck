import { Authenticated, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
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
  const [activeTab, setActiveTabState] = useState("gallery");
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  // Check backend auth state to verify if user is actually logged in
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const setActiveTab = (tab: string) => {
    console.log("🔄 Setting active tab to:", tab);
    setActiveTabState(tab);
    window.location.hash = tab;
  };
  
  // Debug authentication state - CRITICAL for diagnosing "can't access pages" issue
  useEffect(() => {
    const authState = { isLoading, isAuthenticated, loggedInUser: loggedInUser !== undefined ? (loggedInUser !== null ? "logged in" : "not logged in") : "loading" };
    console.log("🔐 App Auth State:", JSON.stringify(authState, null, 2));
    console.log("🔐 Convex URL:", import.meta.env.VITE_CONVEX_URL);
    console.log("🔐 Backend User:", loggedInUser);
    
    // Check localStorage for auth tokens
    const convexAuthStorage = localStorage.getItem("convex-auth");
    console.log("🔐 LocalStorage Auth:", convexAuthStorage ? "exists" : "missing");
    if (convexAuthStorage) {
      try {
        const parsed = JSON.parse(convexAuthStorage);
        console.log("🔐 Auth Token Keys:", Object.keys(parsed));
      } catch (e) {
        console.log("🔐 Auth Storage Parse Error:", e);
      }
    }
  }, [isAuthenticated, isLoading, loggedInUser]);

  useEffect(() => {
    // Set initial tab from hash
    if (window.location.hash) {
      const hashTab = window.location.hash.substring(1);
      if (["gallery", "upload", "boards", "table"].includes(hashTab)) {
        setActiveTabState(hashTab);
      }
    }
    
    // Listen for hash changes
    const handleHashChange = () => {
      const hashTab = window.location.hash.substring(1);
      if (["gallery", "upload", "boards", "table"].includes(hashTab)) {
        setActiveTabState(hashTab);
      }
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const [boardVersion, setBoardVersion] = useState(0);

  const incrementBoardVersion = () => setBoardVersion(v => v + 1);

  // Debug log
  console.log("Active tab:", activeTab);

  return (
    <Box className="min-h-screen">
      <Box as="header" className="sticky top-0 z-50 border-b border-gray-6 bg-gray-2/80 backdrop-blur-md">
        <Box className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
          {/* Show tabs if authenticated OR if backend says user is logged in (workaround) */}
          {(isAuthenticated || loggedInUser) && (
            <Box className="mt-4">
              <Tabs.Root 
                value={activeTab} 
                onValueChange={(value) => {
                  console.log("📑 Tab changed to:", value);
                  if (value) setActiveTab(value);
                }}
              >
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
          )}
          {(isAuthenticated || loggedInUser) && activeTab === "gallery" && (
            <Box className="mt-4">
              <CategoryFilter 
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </Box>
          )}
        </Box>
      </Box>

      <Box as="main" className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Show authenticated content if frontend says authenticated OR backend says user exists */}
        {(isAuthenticated || loggedInUser) ? (
          <>
            {activeTab === "gallery" && (
              <Content 
                searchTerm={searchTerm}
                selectedCategory={selectedCategory}
                setActiveTab={setActiveTab}
                incrementBoardVersion={incrementBoardVersion}
              />
            )}
            {activeTab === "upload" && <ImageUploadForm />}
            {activeTab === "boards" && <BoardsView 
                                        key={boardVersion} 
                                        setActiveTab={setActiveTab} 
                                        incrementBoardVersion={incrementBoardVersion} 
                                      />}
            {activeTab === "table" && <TableView />}
          </>
        ) : (
          <Content 
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            setActiveTab={setActiveTab}
            incrementBoardVersion={incrementBoardVersion}
          />
        )}
      </Box>
      
      <Toaster theme="dark" />
    </Box>
  );
}

function Content({ searchTerm, selectedCategory, setActiveTab, incrementBoardVersion }: { 
  searchTerm: string; 
  selectedCategory: string | undefined;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
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
    <Flex direction="column" gap="8">
      <Unauthenticated>
        <Flex direction="column" align="center" gap="6" className="text-center py-16">
          <Text size="8" weight="bold">
            Discover Visual Inspiration
          </Text>
          <Text size="4" color="gray" className="max-w-2xl">
            A curated collection of visual references, design inspiration, and creative shots
          </Text>
          <Box className="max-w-md w-full">
            <SignInForm />
          </Box>
        </Flex>
      </Unauthenticated>

      <Authenticated>
        <ImageGrid 
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          setActiveTab={setActiveTab}
          incrementBoardVersion={incrementBoardVersion}
        />
      </Authenticated>
    </Flex>
  );
}
