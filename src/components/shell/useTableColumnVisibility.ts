import { useEffect, useState } from "react";
import {
  defaultTableVisibleColumns,
  type TableColumnKey,
} from "./types";

export const TABLE_COLUMN_VISIBILITY_STORAGE_KEY =
  "pindeck_table_visible_columns";

export function parseStoredTableColumnVisibility(
  raw: string | null,
): Record<TableColumnKey, boolean> {
  if (!raw) return defaultTableVisibleColumns;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<TableColumnKey, boolean>>;
    return { ...defaultTableVisibleColumns, ...parsed };
  } catch {
    return defaultTableVisibleColumns;
  }
}

export function readStoredTableColumnVisibility(): Record<
  TableColumnKey,
  boolean
> {
  try {
    return parseStoredTableColumnVisibility(
      window.localStorage.getItem(TABLE_COLUMN_VISIBILITY_STORAGE_KEY),
    );
  } catch {
    return defaultTableVisibleColumns;
  }
}

export function useTableColumnVisibility() {
  const [tableVisibleColumns, setTableVisibleColumns] = useState<
    Record<TableColumnKey, boolean>
  >(readStoredTableColumnVisibility);

  useEffect(() => {
    try {
      localStorage.setItem(
        TABLE_COLUMN_VISIBILITY_STORAGE_KEY,
        JSON.stringify(tableVisibleColumns),
      );
    } catch {
      // Column visibility should never block app rendering.
    }
  }, [tableVisibleColumns]);

  return { tableVisibleColumns, setTableVisibleColumns };
}
