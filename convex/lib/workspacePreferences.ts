import { v } from "convex/values";

/** Validated, per-account workspace layout. Transient dialogs and search are excluded. */
export const workspacePreferences = v.object({
  view: v.union(
    v.literal("gallery"),
    v.literal("table"),
    v.literal("boards"),
    v.literal("deck"),
    v.literal("upload"),
    v.literal("docs"),
  ),
  galleryDisplayMode: v.union(
    v.literal("random"),
    v.literal("project-rows"),
    v.literal("sref-rows"),
  ),
  activeDeckId: v.union(v.id("decks"), v.null()),
  sidebarCollapsed: v.boolean(),
  tableVisibleColumns: v.record(v.string(), v.boolean()),
  tableColumnWidths: v.optional(v.record(v.string(), v.number())),
  libraryFilter: v.object({
    group: v.union(v.string(), v.null()),
    genre: v.union(v.string(), v.null()),
    style: v.union(v.string(), v.null()),
    originalsOnly: v.boolean(),
    noOriginals: v.boolean(),
    hasSref: v.boolean(),
    colorHex: v.union(v.string(), v.null()),
  }),
  tweaks: v.object({
    accent: v.string(),
    typography: v.string(),
    density: v.union(
      v.literal("dense"),
      v.literal("cozy"),
      v.literal("comfortable"),
    ),
    cardStyle: v.union(
      v.literal("bordered"),
      v.literal("bare"),
      v.literal("glass"),
      v.literal("filmstrip"),
    ),
    hover: v.union(
      v.literal("lift"),
      v.literal("tilt"),
      v.literal("zoom"),
      v.literal("flip"),
    ),
    letterbox: v.boolean(),
    grain: v.boolean(),
    showTweaks: v.boolean(),
  }),
});
