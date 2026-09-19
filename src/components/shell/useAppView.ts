import { useEffect, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { APP_VIEWS, type AppViewId, type GalleryDisplayMode } from "./types";

const VIEW_STORAGE_KEY = "pindeck_view";
const GALLERY_DISPLAY_MODE_STORAGE_KEY = "pindeck_gallery_display_mode";

const VALID_VIEW_IDS = new Set<string>(APP_VIEWS.map((v) => v.id));

export function sanitizeStoredView(raw: string | null): AppViewId {
  if (raw && VALID_VIEW_IDS.has(raw)) return raw as AppViewId;
  return "gallery";
}

export function sanitizeGalleryDisplayMode(
  raw: string | null,
): GalleryDisplayMode {
  return raw === "project-rows" || raw === "sref-rows" || raw === "random"
    ? raw
    : "random";
}

export function useAppView() {
  const [view, setView] = useState<AppViewId>(() =>
    sanitizeStoredView(localStorage.getItem(VIEW_STORAGE_KEY)),
  );
  const [galleryDisplayMode, setGalleryDisplayMode] =
    useState<GalleryDisplayMode>(() =>
      sanitizeGalleryDisplayMode(
        localStorage.getItem(GALLERY_DISPLAY_MODE_STORAGE_KEY),
      ),
    );
  const [activeDeckId, setActiveDeckId] = useState<Id<"decks"> | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(
      GALLERY_DISPLAY_MODE_STORAGE_KEY,
      galleryDisplayMode,
    );
  }, [galleryDisplayMode]);

  useEffect(() => {
    if (view !== "deck") setActiveDeckId(null);
  }, [view]);

  const selectView = (nextView: string) => {
    setView(sanitizeStoredView(nextView));
  };

  const openDeck = (deckId: Id<"decks">) => {
    setActiveDeckId(deckId);
    setView("deck");
  };

  return {
    view,
    setView,
    selectView,
    galleryDisplayMode,
    setGalleryDisplayMode,
    activeDeckId,
    setActiveDeckId,
    openDeck,
  };
}
