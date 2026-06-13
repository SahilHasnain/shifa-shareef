import { useMemo } from "react";

import { getVolumeByLanguageAndId } from "../data/languages";
import type { UnifiedProgress } from "../data/types";
import { getCurrentSection } from "../lib/section-resolver";
import { useEpubProgress } from "./useEpubProgress";
import { useReadingProgress } from "./useReadingProgress";

export function useVolumeProgress(
  volumeId: string,
  languageId: string,
): {
  progress: UnifiedProgress;
  isLoaded: boolean;
  savePage: (page: number) => Promise<void>;
  saveEpub: (cfi: string, progressPercent: number) => Promise<void>;
} {
  const volume = getVolumeByLanguageAndId(languageId, volumeId);
  const imageProgress = useReadingProgress(volumeId, languageId);
  const epubProgress = useEpubProgress(volumeId, languageId);

  const progress = useMemo((): UnifiedProgress => {
    if (volume.format === "epub") {
      const epub = epubProgress.progress;
      const baseProgress: UnifiedProgress = {
        format: "epub",
        lastCfi: epub.lastCfi || undefined,
        progressPercent: epub.progressPercent,
        lastReadAt: epub.lastReadAt,
      };
      const currentSection = getCurrentSection(volume, baseProgress);

      return {
        ...baseProgress,
        currentSectionId: currentSection?.id,
        currentSectionTitle: currentSection?.title,
      };
    }

    const image = imageProgress.progress;
    const baseProgress: UnifiedProgress = {
      format: "image",
      lastPage: image.lastPage,
      lastReadAt: image.lastReadAt,
    };
    const currentSection = getCurrentSection(volume, baseProgress);

    return {
      ...baseProgress,
      currentSectionId: currentSection?.id,
      currentSectionTitle: currentSection?.title,
    };
  }, [volume, imageProgress.progress, epubProgress.progress]);

  return {
    progress,
    isLoaded:
      volume.format === "epub" ? epubProgress.isLoaded : imageProgress.isLoaded,
    savePage: imageProgress.saveProgress,
    saveEpub: epubProgress.saveProgress,
  };
}
