import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_LANGUAGE_ID } from "../data/languages";
import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { ReadingProgress } from "../data/types";
import {
  loadReadingProgress,
  saveReadingProgress,
} from "../lib/progress-storage";

const defaultProgress: ReadingProgress = {
  progressPercent: 0,
};

export function useReadingProgress(
  volumeId: string = DEFAULT_VOLUME_ID,
  languageId: string = DEFAULT_LANGUAGE_ID,
) {
  const [progress, setProgress] = useState<ReadingProgress>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const stored = await loadReadingProgress(languageId, volumeId);
      setProgress(stored);
    } finally {
      setIsLoaded(true);
    }
  }, [languageId, volumeId]);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      await loadProgress();
    }

    if (isMounted) {
      void initialize();
    }

    return () => {
      isMounted = false;
    };
  }, [loadProgress]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const saveProgress = useCallback(
    async (cfi: string, progressPercent: number) => {
      const nextProgress: ReadingProgress = {
        lastCfi: cfi,
        progressPercent,
        lastReadAt: new Date().toISOString(),
      };

      setProgress(nextProgress);
      await saveReadingProgress(languageId, volumeId, nextProgress);
    },
    [languageId, volumeId],
  );

  return {
    progress,
    isLoaded,
    saveProgress,
  };
}
