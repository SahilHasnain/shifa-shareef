import type { Bookmark, ReadingProgress, Volume } from "../data/types";
import { getCurrentSection } from "./section-resolver";
import type { ReaderNavigationTarget } from "./section-resolver";

function getBookmarkPercent(volume: Volume, bookmark: Bookmark): number {
  if (bookmark.progressPercent != null) {
    return bookmark.progressPercent;
  }

  if (bookmark.page != null && bookmark.page > 0) {
    return bookmark.page / volume.totalPages;
  }

  return 0;
}

export function getBookmarkNavigationTarget(
  volume: Volume,
  bookmark: Bookmark,
): ReaderNavigationTarget {
  const bookmarkPercent = getBookmarkPercent(volume, bookmark);

  if (bookmark.cfi) {
    return {
      cfi: bookmark.cfi,
      progressPercent: bookmarkPercent,
    };
  }

  return {
    progressPercent: bookmarkPercent,
  };
}

export function getBookmarkDisplayLabel(
  volume: Volume,
  bookmark: Bookmark,
): string {
  return `${Math.round(getBookmarkPercent(volume, bookmark) * 100)}%`;
}

export function getBookmarkSection(volume: Volume, bookmark: Bookmark) {
  const progress: ReadingProgress = {
    progressPercent: getBookmarkPercent(volume, bookmark),
    lastCfi: bookmark.cfi,
  };

  return getCurrentSection(volume, progress);
}
