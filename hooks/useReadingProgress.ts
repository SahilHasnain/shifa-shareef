import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useEffect, useState } from "react";

const STORAGE_KEY = "shifa-shareef:reading-progress";

type ReadingProgress = {
  lastPage: number;
  lastReadAt?: string;
};

const defaultProgress: ReadingProgress = {
  lastPage: 1,
};

export function useReadingProgress() {
  const [progress, setProgress] = useState<ReadingProgress>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
  };

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
  }, []);

  useFocusEffect(() => {
    loadProgress();
  });

  const saveProgress = async (page: number) => {
    const nextProgress = {
      lastPage: page,
      lastReadAt: new Date().toISOString(),
    };

    setProgress(nextProgress);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
  };

  return {
    progress,
    isLoaded,
    saveProgress,
  };
}
