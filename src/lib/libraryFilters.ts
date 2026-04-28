/** Sidebar + gallery/table shared filter state */

export type LibraryFilters = {
  /** `null` = no filter; `""` = images with empty `group` */
  group: string | null;
  genre: string | null;
  style: string | null;
  originalsOnly: boolean;
  hasSref: boolean;
};

export function defaultLibraryFilters(): LibraryFilters {
  return {
    group: null,
    genre: null,
    style: null,
    originalsOnly: false,
    hasSref: false,
  };
}

export function applyLibraryFilters<T extends {
  group?: string;
  genre?: string;
  style?: string;
  parentImageId?: string;
  sref?: string;
}>(images: T[], f: LibraryFilters): T[] {
  return images.filter((im) => {
    if (f.group !== null) {
      const g = im.group?.trim() ?? "";
      if (f.group === "") {
        if (g) return false;
      } else if (g !== f.group) return false;
    }
    if (f.genre !== null && (im.genre?.trim() ?? "") !== f.genre) return false;
    if (f.style !== null && (im.style?.trim() ?? "") !== f.style) return false;
    if (f.originalsOnly && im.parentImageId) return false;
    if (f.hasSref && !im.sref?.trim()) return false;
    return true;
  });
}
