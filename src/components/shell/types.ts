export const APP_VIEWS = [
  { id: "gallery", label: "Gallery", short: "Gal", icon: "masonry", hk: "G" },
  { id: "table", label: "Table", short: "Tbl", icon: "table", hk: "T" },
  { id: "boards", label: "Boards", short: "Bds", icon: "board", hk: "B" },
  { id: "deck", label: "Decks", short: "Dks", icon: "deck", hk: "D" },
  { id: "upload", label: "Upload", short: "Up", icon: "upload", hk: "U" },
] as const;

export type AppViewId = (typeof APP_VIEWS)[number]["id"];
export type GalleryDisplayMode = "random" | "project-rows" | "sref-rows";
export type TableColumnKey =
  | "date"
  | "group"
  | "genre"
  | "shot"
  | "style"
  | "tags"
  | "palette"
  | "sref"
  | "likes"
  | "views";

export const defaultTableVisibleColumns: Record<TableColumnKey, boolean> = {
  date: true,
  group: true,
  genre: true,
  shot: true,
  style: true,
  tags: true,
  palette: true,
  sref: true,
  likes: true,
  views: true,
};

export const tableColumnOptions: Array<{
  key: TableColumnKey;
  label: string;
}> = [
  { key: "date", label: "Date" },
  { key: "group", label: "Type" },
  { key: "genre", label: "Genre" },
  { key: "shot", label: "Shot" },
  { key: "style", label: "Style" },
  { key: "tags", label: "Tags" },
  { key: "palette", label: "Palette" },
  { key: "sref", label: "SREF" },
  { key: "likes", label: "Likes" },
  { key: "views", label: "Views" },
];
