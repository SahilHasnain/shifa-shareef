import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { Bookmark } from "../data/types";

export type { Bookmark } from "../data/types";

export function useBookmarks(volumeId: string = DEFAULT_VOLUME_ID) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `shifa-shareef:bookmarks-${volumeId}`;

  const loadBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) {
        setBookmarks([]);
        return;
      }

      const parsed = JSON.parse(stored) as Bookmark[];
      // Sort by page number
      const sorted = parsed.sort((a, b) => a.page - b.page);
      setBookmarks(sorted);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    void loadBookmarks();
  }, [storageKey]);

  const addBookmark = async (page: number, label?: string) => {
    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      volumeId,
      page,
      label,
      createdAt: new Date().toISOString(),
    };

    const updated = [...bookmarks, newBookmark].sort((a, b) => a.page - b.page);
    setBookmarks(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const removeBookmark = async (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const isBookmarked = (page: number) => {
    return bookmarks.some((b) => b.page === page);
  };

  const getBookmarkForPage = (page: number) => {
    return bookmarks.find((b) => b.page === page);
  };

  return {
    bookmarks,
    isLoaded,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarkForPage,
  };
}
