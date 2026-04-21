import { useState } from "react";
import type { FormEvent } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (term: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-[20rem]">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#4cc2ff]" />
      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search visuals..."
        className="h-8 w-full rounded-[4px] border-0 pl-10 shadow-none transition-colors placeholder:text-[#4cc2ff]/55 focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{
          backgroundColor: 'rgba(0, 144, 255, 0.16)',
          color: '#4cc2ff',
        }}
      />
    </form>
  );
}
