import { useMemo } from "react";

import { getVolumeByLanguageAndId } from "../data/languages";
import type { ReadingProgress } from "../data/types";
import { getCurrentSection } from "../lib/section-resolver";
import { useReadingProgress } from "./useReadingProgress";

export function useVolumeProgress(
  volumeId: string,
  languageId: string,
): {
  progress: ReadingProgress;
  isLoaded: boolean;
} {
  const volume = getVolumeByLanguageAndId(languageId, volumeId);
  const { progress: storedProgress, isLoaded } = useReadingProgress(
    volumeId,
    languageId,
  );

  const progress = useMemo((): ReadingProgress => {
    const currentSection = getCurrentSection(volume, storedProgress);

    return {
      ...storedProgress,
      currentSectionId: currentSection?.id,
      currentSectionTitle: currentSection?.title,
    };
  }, [storedProgress, volume]);

  return {
    progress,
    isLoaded,
  };
}
