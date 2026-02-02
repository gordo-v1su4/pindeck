import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Tabs, Box } from "@radix-ui/themes";

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
    <Box className="w-full">
      <Tabs.Root
        value={categoryValue}
        onValueChange={(value) => onCategoryChange(value === "all" ? undefined : value)}
        className="w-full"
      >
        <Tabs.List className="flex-wrap">
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          {categories.map((category) => (
            <Tabs.Trigger key={category} value={category} className="capitalize">
              {category}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </Box>
  );
}
