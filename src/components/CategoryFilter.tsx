import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CategoryFilterProps {
  selectedCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = useQuery(api.images.getCategories);

  if (!categories) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onCategoryChange(undefined)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !selectedCategory
            ? 'bg-zinc-100 text-zinc-900'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
            selectedCategory === category
              ? 'bg-zinc-100 text-zinc-900'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
