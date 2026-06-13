import type { Bookmark, UnifiedProgress, Volume } from "../data/types";
import { getCurrentSection } from "./section-resolver";
import type { ReaderNavigationTarget } from "./section-resolver";

export function getBookmarkNavigationTarget(
  volume: Volume,
  bookmark: Bookmark,
): ReaderNavigationTarget {
  if (volume.format === "epub") {
    if (bookmark.cfi || bookmark.progressPercent != null) {
      return {
        format: "epub",
        cfi: bookmark.cfi,
        progressPercent: bookmark.progressPercent,
      };
    }

    return {
      format: "epub",
      progressPercent: (bookmark.page - 1) / volume.totalPages,
    };
  }

  return {
    format: "image",
    page: bookmark.page,
  };
}

export function getBookmarkDisplayLabel(volume: Volume, bookmark: Bookmark): string {
  if (volume.format === "epub" && bookmark.progressPercent != null) {
    return `${Math.round(bookmark.progressPercent * 100)}%`;
  }

  if (volume.format === "epub") {
    return `~Page ${bookmark.page}`;
  }

  return `Page ${bookmark.page}`;
}

export function getBookmarkSection(
  volume: Volume,
  bookmark: Bookmark,
) {
  const progress: UnifiedProgress =
    volume.format === "epub"
      ? {
          format: "epub",
          progressPercent: bookmark.progressPercent,
          lastCfi: bookmark.cfi,
        }
      : {
          format: "image",
          lastPage: bookmark.page,
        };

  return getCurrentSection(volume, progress);
}
