import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Tabs } from "@radix-ui/themes";

interface CategoryFilterProps {
  selectedCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = useQuery(api.images.getCategories);

  if (!categories) return null;

  const currentValue = selectedCategory || "all";

  return (
    <Tabs.Root
      value={currentValue}
      onValueChange={(value) => onCategoryChange(value === "all" ? undefined : value)}
      className="w-full"
    >
      <Tabs.List>
        <Tabs.Trigger value="all">All</Tabs.Trigger>
        {categories.map((category) => (
          <Tabs.Trigger key={category} value={category} className="capitalize">
            {category}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
