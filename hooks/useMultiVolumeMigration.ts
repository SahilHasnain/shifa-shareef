import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_LANGUAGE_ID } from "../data/languages";
import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { Bookmark } from "../data/types";

const MIGRATION_KEY = "shifa-shareef:migrated-to-multi-volume";
const LANGUAGE_MIGRATION_KEY = "shifa-shareef:migrated-to-language-aware";

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
          `shifa-shareef:current-volume-id-${DEFAULT_LANGUAGE_ID}`,
          DEFAULT_VOLUME_ID,
        );
        await AsyncStorage.setItem(MIGRATION_KEY, "true");
      }

      const languageMigrated = await AsyncStorage.getItem(LANGUAGE_MIGRATION_KEY);

      if (!languageMigrated) {
        await AsyncStorage.setItem(
          "shifa-shareef:current-language-id",
          DEFAULT_LANGUAGE_ID,
        );

        for (const volumeId of ["volume1", "volume2"]) {
          const progressKey = `shifa-shareef:reading-progress-${volumeId}`;
          const progress = await AsyncStorage.getItem(progressKey);
          if (progress) {
            await AsyncStorage.setItem(
              `shifa-shareef:reading-progress-${DEFAULT_LANGUAGE_ID}-${volumeId}`,
              progress,
            );
          }

          const bookmarksKey = `shifa-shareef:bookmarks-${volumeId}`;
          const bookmarks = await AsyncStorage.getItem(bookmarksKey);
          if (bookmarks) {
            const parsed = JSON.parse(bookmarks) as Array<
              Omit<Bookmark, "languageId" | "volumeId"> & {
                languageId?: string;
                volumeId?: string;
              }
            >;
            const migratedBookmarks: Bookmark[] = parsed.map((bookmark) => ({
              ...bookmark,
              languageId: bookmark.languageId ?? DEFAULT_LANGUAGE_ID,
              volumeId: bookmark.volumeId ?? volumeId,
            }));
            await AsyncStorage.setItem(
              `shifa-shareef:bookmarks-${DEFAULT_LANGUAGE_ID}-${volumeId}`,
              JSON.stringify(migratedBookmarks),
            );
          }

          const planKey = `shifa-shareef:active-plan-${volumeId}`;
          const plan = await AsyncStorage.getItem(planKey);
          if (plan) {
            await AsyncStorage.setItem(
              `shifa-shareef:active-plan-${DEFAULT_LANGUAGE_ID}-${volumeId}`,
              plan,
            );
          }

          const currentVolumeKey = `shifa-shareef:current-volume-id-${DEFAULT_LANGUAGE_ID}`;
          const existingCurrentVolume = await AsyncStorage.getItem(currentVolumeKey);
          if (!existingCurrentVolume) {
            await AsyncStorage.setItem(currentVolumeKey, DEFAULT_VOLUME_ID);
          }
        }

        const sessions = await AsyncStorage.getItem("shifa-shareef:reading-sessions");
        if (sessions) {
          const parsedSessions = JSON.parse(sessions) as {
            sessions?: Array<Record<string, unknown>>;
            lastSessionDate?: string | null;
          };

          if (Array.isArray(parsedSessions.sessions)) {
            const migratedSessions = parsedSessions.sessions.map((session) => {
              const existingLanguageId =
                typeof session.languageId === "string"
                  ? session.languageId
                  : DEFAULT_LANGUAGE_ID;

              return {
                ...session,
                languageId: existingLanguageId,
              };
            });

            await AsyncStorage.setItem(
              "shifa-shareef:reading-sessions",
              JSON.stringify({
                ...parsedSessions,
                sessions: migratedSessions,
              }),
            );
          }
        }

        await AsyncStorage.setItem(LANGUAGE_MIGRATION_KEY, "true");
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
