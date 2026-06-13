import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { getLanguageById } from "../data/languages";
import type { UnifiedProgress } from "../data/types";
import { getResolvedVolume } from "../lib/reading-format-resolver";
import { useReadingFormatPreference } from "./useReadingFormatPreference";

type ImageProgress = {
  lastPage: number;
  lastReadAt?: string;
};

type EpubProgress = {
  lastCfi: string;
  progressPercent: number;
  lastReadAt?: string;
};

export function useLanguageVolumeProgresses(languageId: string) {
  const [progressByVolume, setProgressByVolume] = useState<
    Record<string, UnifiedProgress>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);
  const { preference } = useReadingFormatPreference();

  const loadProgresses = useCallback(async () => {
    const language = getLanguageById(languageId);

    const entries = await Promise.all(
      language.volumes.map(async (volume) => {
        const resolvedVolume = getResolvedVolume(volume, preference);

        if (resolvedVolume.format === "epub") {
          const stored = await AsyncStorage.getItem(
            `shifa-shareef:epub-progress-${languageId}-${volume.id}`,
          );
          const parsed = stored
            ? (JSON.parse(stored) as EpubProgress)
            : { lastCfi: "", progressPercent: 0 };

          const progress: UnifiedProgress = {
            format: "epub",
            lastCfi: parsed.lastCfi || undefined,
            progressPercent: parsed.progressPercent ?? 0,
            lastReadAt: parsed.lastReadAt,
          };

          return [volume.id, progress] as const;
        }

        const stored = await AsyncStorage.getItem(
          `shifa-shareef:reading-progress-${languageId}-${volume.id}`,
        );
        const parsed = stored
          ? (JSON.parse(stored) as ImageProgress)
          : { lastPage: 1 };

        const progress: UnifiedProgress = {
          format: "image",
          lastPage: parsed.lastPage ?? 1,
          lastReadAt: parsed.lastReadAt,
        };

        return [volume.id, progress] as const;
      }),
    );

    setProgressByVolume(Object.fromEntries(entries));
    setIsLoaded(true);
  }, [languageId, preference]);

  useEffect(() => {
    void loadProgresses();
  }, [loadProgresses]);

  useFocusEffect(
    useCallback(() => {
      void loadProgresses();
    }, [loadProgresses]),
  );

  return {
    progressByVolume,
    isLoaded,
    reload: loadProgresses,
  };
}
