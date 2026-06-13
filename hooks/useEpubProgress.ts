import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_LANGUAGE_ID } from "../data/languages";
import { DEFAULT_VOLUME_ID } from "../data/volumes";

type EpubProgress = {
  lastCfi: string;
  progressPercent: number;
  lastReadAt?: string;
};

const defaultProgress: EpubProgress = {
  lastCfi: "",
  progressPercent: 0,
};

export function useEpubProgress(
  volumeId: string = DEFAULT_VOLUME_ID,
  languageId: string = DEFAULT_LANGUAGE_ID,
) {
  const [progress, setProgress] = useState<EpubProgress>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `shifa-shareef:epub-progress-${languageId}-${volumeId}`;

  const loadProgress = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) {
        setProgress(defaultProgress);
        return;
      }

      const parsed = JSON.parse(stored) as EpubProgress;
      setProgress({
        lastCfi: parsed.lastCfi ?? "",
        progressPercent: parsed.progressPercent ?? 0,
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

  const saveProgress = useCallback(
    async (cfi: string, progressPercent: number) => {
      const nextProgress = {
        lastCfi: cfi,
        progressPercent,
        lastReadAt: new Date().toISOString(),
      };

      setProgress(nextProgress);
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextProgress));
    },
    [storageKey],
  );

  return {
    progress,
    isLoaded,
    saveProgress,
  };
}
