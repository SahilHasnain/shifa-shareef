import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_LANGUAGE_ID } from "../data/languages";
import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { ReadingProgress } from "../data/types";

const defaultProgress: ReadingProgress = {
  lastPage: 1,
};

export function useReadingProgress(
  volumeId: string = DEFAULT_VOLUME_ID,
  languageId: string = DEFAULT_LANGUAGE_ID,
) {
  const [progress, setProgress] = useState<ReadingProgress>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `shifa-shareef:reading-progress-${languageId}-${volumeId}`;

  const loadProgress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) {
        setProgress(defaultProgress);
        return;
      }

      const parsed = JSON.parse(stored) as ReadingProgress;
      setProgress({
        lastPage: typeof parsed.lastPage === "number" ? parsed.lastPage : 1,
        lastReadAt: parsed.lastReadAt,
      });
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      await loadProgress();
    }

    if (isMounted) {
      initialize();
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

  const saveProgress = useCallback(async (page: number) => {
    const nextProgress = {
      lastPage: page,
      lastReadAt: new Date().toISOString(),
    };

    setProgress(nextProgress);
    await AsyncStorage.setItem(storageKey, JSON.stringify(nextProgress));
  }, [storageKey]);

  return {
    progress,
    isLoaded,
    saveProgress,
  };
}
