import { useState } from "react";
import {
  defaultLibraryFilters,
  type LibraryFilters,
} from "@/lib/libraryFilters";

export function useLibraryFilterState() {
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilters>(
    defaultLibraryFilters,
  );
  return { libraryFilter, setLibraryFilter };
}
