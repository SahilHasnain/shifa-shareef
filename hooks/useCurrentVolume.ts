import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_VOLUME_ID,
  getVolumeByLanguageAndId,
} from "../data/languages";

export function useCurrentVolume(languageId: string = DEFAULT_LANGUAGE_ID) {
  const storageKey = `shifa-shareef:current-volume-id-${languageId}`;
  const [currentVolumeId, setCurrentVolumeId] = useState(
    getVolumeByLanguageAndId(languageId, DEFAULT_VOLUME_ID).id,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(storageKey)
      .then((storedVolumeId) => {
        if (!isMounted || !storedVolumeId) {
          return;
        }

        setCurrentVolumeId(getVolumeByLanguageAndId(languageId, storedVolumeId).id);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  const switchVolume = async (volumeId: string) => {
    const safeVolumeId = getVolumeByLanguageAndId(languageId, volumeId).id;
    setCurrentVolumeId(safeVolumeId);
    await AsyncStorage.setItem(storageKey, safeVolumeId);
  };

  return {
    currentVolumeId,
    currentVolume: getVolumeByLanguageAndId(languageId, currentVolumeId),
    isLoaded,
    switchVolume,
  };
}
