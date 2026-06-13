import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { ReadingFormatPreference } from "../data/types";

const STORAGE_KEY = "shifa-shareef:reading-format-preference";

export function useReadingFormatPreference() {
  const [preference, setPreferenceState] = useState<ReadingFormatPreference>("epub");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;

        if (stored === "epub" || stored === "image") {
          setPreferenceState(stored);
        }

        setIsLoaded(true);
      } catch {
        if (isMounted) {
          setPreferenceState("epub");
          setIsLoaded(true);
        }
      }
    }

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(async (nextPreference: ReadingFormatPreference) => {
    setPreferenceState(nextPreference);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
    } catch {
      // Keep the in-memory preference even if persistence fails.
    }
  }, []);

  return {
    preference,
    isLoaded,
    setPreference,
  };
}
