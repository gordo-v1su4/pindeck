import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Tabs, Box, Flex, Text, Select } from "@radix-ui/themes";

interface CategoryFilterProps {
  selectedGroup: string | undefined;
  onGroupChange: (group: string | undefined) => void;
  selectedCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
  selectedSref: string | undefined;
  onSrefChange: (sref: string | undefined) => void;
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  selectedSref,
  onSrefChange,
}: CategoryFilterProps) {
  const categories = useQuery(api.images.getCategories);
  const images = useQuery(api.images.list, { limit: 1000 });

  if (!categories) return null;

  const categoryValue = selectedCategory || "all";
  const srefValues = Array.from(
    new Set(
      (images || [])
        .map((image) => image.sref)
        .filter((sref): sref is string => Boolean(sref))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  return (
    <Flex direction="column" gap="3" className="w-full">
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

      <Box>
        <Text size="2" color="gray" className="mb-1 block">
          Sref
        </Text>
        <Select.Root
          value={selectedSref || "all"}
          onValueChange={(value) => onSrefChange(value === "all" ? undefined : value)}
        >
          <Select.Trigger placeholder="Filter by sref" />
          <Select.Content>
            <Select.Item value="all">All srefs</Select.Item>
            {srefValues.map((sref) => (
              <Select.Item key={sref} value={sref}>
                {sref}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Box>
    </Flex>
  );
}
