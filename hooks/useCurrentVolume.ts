import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_VOLUME_ID, getVolumeById } from "../data/volumes";

const STORAGE_KEY = "shifa-shareef:current-volume-id";

export function useCurrentVolume() {
  const [currentVolumeId, setCurrentVolumeId] = useState(DEFAULT_VOLUME_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedVolumeId) => {
        if (!isMounted || !storedVolumeId) {
          return;
        }

        setCurrentVolumeId(getVolumeById(storedVolumeId).id);
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

  const switchVolume = async (volumeId: string) => {
    const safeVolumeId = getVolumeById(volumeId).id;
    setCurrentVolumeId(safeVolumeId);
    await AsyncStorage.setItem(STORAGE_KEY, safeVolumeId);
  };

  return {
    currentVolumeId,
    currentVolume: getVolumeById(currentVolumeId),
    isLoaded,
    switchVolume,
  };
}
