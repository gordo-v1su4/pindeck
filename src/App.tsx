import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ImageGrid } from "./components/ImageGrid";
import { SearchBar } from "./components/SearchBar";
import { CategoryFilter } from "./components/CategoryFilter";
import { useState, useEffect } from "react";

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-zinc-100">Visuals</h1>
              <Authenticated>
                <SearchBar onSearch={setSearchTerm} />
              </Authenticated>
            </div>
            <div className="flex items-center gap-4">
              <Authenticated>
                <SignOutButton />
              </Authenticated>
            </div>
          </div>
          <Authenticated>
            <div className="mt-4">
              <CategoryFilter 
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </Authenticated>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Content 
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
        />
      </main>
      
      <Toaster theme="dark" />
    </div>
  );
}

function Content({ searchTerm, selectedCategory }: { 
  searchTerm: string; 
  selectedCategory: string | undefined;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  useEffect(() => {
    console.log("🔐 Auth State:", { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Unauthenticated>
        <div className="text-center space-y-6 py-16">
          <h2 className="text-4xl font-bold text-zinc-100">
            Discover Visual Inspiration
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            A curated collection of visual references, design inspiration, and creative shots
          </p>
          <div className="max-w-md mx-auto">
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <ImageGrid 
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
        />
      </Authenticated>
    </div>
  );
}
