import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_LANGUAGE_ID } from "../data/languages";
import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { Bookmark } from "../data/types";

export type { Bookmark } from "../data/types";

type AddBookmarkOptions = {
  label?: string;
  cfi?: string;
  progressPercent?: number;
};

function sortBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => {
    if (a.progressPercent != null && b.progressPercent != null) {
      return a.progressPercent - b.progressPercent;
    }

    return (a.page ?? 0) - (b.page ?? 0);
  });
}

export function useBookmarks(
  volumeId: string = DEFAULT_VOLUME_ID,
  languageId: string = DEFAULT_LANGUAGE_ID,
) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `shifa-shareef:bookmarks-${languageId}-${volumeId}`;

  const loadBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) {
        setBookmarks([]);
        return;
      }

      const parsed = JSON.parse(stored) as Bookmark[];
      setBookmarks(sortBookmarks(parsed));
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    void loadBookmarks();
  }, [storageKey]);

  const addBookmark = async (
    page?: number,
    options?: AddBookmarkOptions,
  ) => {
    // Check if bookmark already exists at this location
    const existingBookmark = getBookmarkForLocation(
      options?.cfi,
      options?.progressPercent,
    );
    
    if (existingBookmark) {
      // Don't add duplicate bookmark
      return;
    }

    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      languageId,
      volumeId,
      page: page ?? undefined,
      label: options?.label,
      cfi: options?.cfi,
      progressPercent: options?.progressPercent,
      createdAt: new Date().toISOString(),
    };

    const updated = sortBookmarks([...bookmarks, newBookmark]);
    setBookmarks(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const removeBookmark = async (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const isBookmarked = (
    page: number,
    cfi?: string,
    progressPercent?: number,
  ) => {
    if (cfi) {
      return bookmarks.some((bookmark) => bookmark.cfi === cfi);
    }

    if (progressPercent != null) {
      return bookmarks.some(
        (bookmark) =>
          bookmark.progressPercent != null &&
          Math.abs(bookmark.progressPercent - progressPercent) < 0.005,
      );
    }

    return page != null && bookmarks.some((bookmark) => bookmark.page === page);
  };

  const getBookmarkForPage = (page: number) => {
    return bookmarks.find((bookmark) => bookmark.page === page);
  };

  const getBookmarkForLocation = (cfi?: string, progressPercent?: number) => {
    if (cfi) {
      return bookmarks.find((bookmark) => bookmark.cfi === cfi);
    }

    if (progressPercent != null) {
      return bookmarks.find(
        (bookmark) =>
          bookmark.progressPercent != null &&
          Math.abs(bookmark.progressPercent - progressPercent) < 0.005,
      );
    }

    return undefined;
  };

  return {
    bookmarks,
    isLoaded,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarkForPage,
    getBookmarkForLocation,
  };
}
