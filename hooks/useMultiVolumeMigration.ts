import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { Bookmark } from "../data/types";

const MIGRATION_KEY = "shifa-shareef:migrated-to-multi-volume";

export function useMultiVolumeMigration() {
  const [isMigrationComplete, setIsMigrationComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function migrate() {
      const migrated = await AsyncStorage.getItem(MIGRATION_KEY);

      if (!migrated) {
        const oldProgress = await AsyncStorage.getItem(
          "shifa-shareef:reading-progress",
        );
        if (oldProgress) {
          await AsyncStorage.setItem(
            `shifa-shareef:reading-progress-${DEFAULT_VOLUME_ID}`,
            oldProgress,
          );
        }

        const oldBookmarks = await AsyncStorage.getItem("shifa-shareef:bookmarks");
        if (oldBookmarks) {
          const bookmarks = JSON.parse(oldBookmarks) as Array<
            Omit<Bookmark, "volumeId"> & { volumeId?: string }
          >;
          const migratedBookmarks: Bookmark[] = bookmarks.map((bookmark) => ({
            ...bookmark,
            volumeId: bookmark.volumeId ?? DEFAULT_VOLUME_ID,
          }));
          await AsyncStorage.setItem(
            `shifa-shareef:bookmarks-${DEFAULT_VOLUME_ID}`,
            JSON.stringify(migratedBookmarks),
          );
        }

        const oldPlan = await AsyncStorage.getItem("shifa-shareef:active-plan");
        if (oldPlan) {
          await AsyncStorage.setItem(
            `shifa-shareef:active-plan-${DEFAULT_VOLUME_ID}`,
            oldPlan,
          );
        }

        await AsyncStorage.setItem(
          "shifa-shareef:current-volume-id",
          DEFAULT_VOLUME_ID,
        );
        await AsyncStorage.setItem(MIGRATION_KEY, "true");
      }

      if (isMounted) {
        setIsMigrationComplete(true);
      }
    }

    void migrate();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isMigrationComplete,
  };
}
