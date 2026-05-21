import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_LANGUAGE_ID, getLanguageById } from "../data/languages";

const STORAGE_KEY = "shifa-shareef:current-language-id";

export function useCurrentLanguage() {
  const [currentLanguageId, setCurrentLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedLanguageId) => {
        if (!isMounted || !storedLanguageId) {
          return;
        }

        setCurrentLanguageId(getLanguageById(storedLanguageId).id);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const switchLanguage = async (languageId: string) => {
    const safeLanguageId = getLanguageById(languageId).id;
    setCurrentLanguageId(safeLanguageId);
    await AsyncStorage.setItem(STORAGE_KEY, safeLanguageId);
  };

  return {
    currentLanguageId,
    currentLanguage: getLanguageById(currentLanguageId),
    isLoaded,
    switchLanguage,
  };
}
