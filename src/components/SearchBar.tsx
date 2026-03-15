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
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#a9cfff]" />
      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search visuals..."
        className="h-8 w-full rounded-[4px] border-0 bg-[#133a63] pl-10 text-[#dbe8ff] placeholder:text-[#9db5d7] shadow-none transition-colors focus-visible:bg-[#17416d] focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </form>
  );
}
