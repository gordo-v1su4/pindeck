import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryFilterProps {
  selectedGroup: string | undefined;
  onGroupChange: (group: string | undefined) => void;
  selectedCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const categories = useQuery(api.images.getCategories);

  if (!categories) return null;

  const categoryValue = selectedCategory || "all";

  return (
    <Tabs
      value={categoryValue}
      onValueChange={(value) => onCategoryChange(value === "all" ? undefined : value)}
      className="w-full"
    >
      <TabsList
        variant="line"
        className="h-auto w-full flex-wrap justify-start rounded-none border-b border-border bg-transparent p-0"
      >
        <TabsTrigger value="all" className="flex-none">
          All
        </TabsTrigger>
        {categories.map((category) => (
          <TabsTrigger key={category} value={category} className="flex-none capitalize">
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
