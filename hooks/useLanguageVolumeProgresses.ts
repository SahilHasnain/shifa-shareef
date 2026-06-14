import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { getLanguageById } from "../data/languages";
import type { ReadingProgress } from "../data/types";
import { loadReadingProgress } from "../lib/progress-storage";

export function useLanguageVolumeProgresses(languageId: string) {
  const [progressByVolume, setProgressByVolume] = useState<
    Record<string, ReadingProgress>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);

  const loadProgresses = useCallback(async () => {
    const language = getLanguageById(languageId);

    const entries = await Promise.all(
      language.volumes.map(async (volume) => {
        const progress = await loadReadingProgress(languageId, volume.id);
        return [volume.id, progress] as const;
      }),
    );

    setProgressByVolume(Object.fromEntries(entries));
    setIsLoaded(true);
  }, [languageId]);

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
