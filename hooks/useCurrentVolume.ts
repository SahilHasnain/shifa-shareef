import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_VOLUME_ID,
  getVolumeByLanguageAndId,
} from "../data/languages";

const volumeListeners = new Set<(
  payload: { languageId: string; volumeId: string },
) => void>();

function notifyVolumeListeners(languageId: string, volumeId: string) {
  volumeListeners.forEach((listener) => listener({ languageId, volumeId }));
}

export function useCurrentVolume(languageId: string = DEFAULT_LANGUAGE_ID) {
  const storageKey = `shifa-shareef:current-volume-id-${languageId}`;
  const [currentVolumeId, setCurrentVolumeId] = useState(
    getVolumeByLanguageAndId(languageId, DEFAULT_VOLUME_ID).id,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const defaultVolumeId = getVolumeByLanguageAndId(languageId, DEFAULT_VOLUME_ID).id;

    setCurrentVolumeId(defaultVolumeId);

    AsyncStorage.getItem(storageKey)
      .then((storedVolumeId) => {
        if (!isMounted) {
          return;
        }

        setCurrentVolumeId(
          getVolumeByLanguageAndId(languageId, storedVolumeId ?? defaultVolumeId).id,
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [languageId, storageKey]);

  useEffect(() => {
    const listener = ({
      languageId: nextLanguageId,
      volumeId,
    }: {
      languageId: string;
      volumeId: string;
    }) => {
      if (nextLanguageId === languageId) {
        setCurrentVolumeId(getVolumeByLanguageAndId(languageId, volumeId).id);
      }
    };

    volumeListeners.add(listener);

    return () => {
      volumeListeners.delete(listener);
    };
  }, [languageId]);

  const switchVolume = async (volumeId: string) => {
    const safeVolumeId = getVolumeByLanguageAndId(languageId, volumeId).id;
    setCurrentVolumeId(safeVolumeId);
    notifyVolumeListeners(languageId, safeVolumeId);
    await AsyncStorage.setItem(storageKey, safeVolumeId);
  };

  return {
    currentVolumeId,
    currentVolume: getVolumeByLanguageAndId(languageId, currentVolumeId),
    isLoaded,
    switchVolume,
  };
}
