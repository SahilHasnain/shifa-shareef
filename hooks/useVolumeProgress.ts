import { useMemo } from "react";

import { getVolumeByLanguageAndId } from "../data/languages";
import type { UnifiedProgress } from "../data/types";
import { getResolvedVolume } from "../lib/reading-format-resolver";
import { getCurrentSection } from "../lib/section-resolver";
import { useEpubProgress } from "./useEpubProgress";
import { useReadingFormatPreference } from "./useReadingFormatPreference";
import { useReadingProgress } from "./useReadingProgress";

export function useVolumeProgress(
  volumeId: string,
  languageId: string,
): {
  progress: UnifiedProgress;
  isLoaded: boolean;
} {
  const baseVolume = getVolumeByLanguageAndId(languageId, volumeId);
  const { preference } = useReadingFormatPreference();
  const volume = useMemo(
    () => getResolvedVolume(baseVolume, preference),
    [baseVolume, preference],
  );
  const imageProgress = useReadingProgress(volumeId, languageId);
  const epubProgress = useEpubProgress(volumeId, languageId);

  const progress = useMemo((): UnifiedProgress => {
    if (volume.format === "epub") {
      const epub = epubProgress.progress;
      const image = imageProgress.progress;
      const baseProgress: UnifiedProgress = {
        format: "epub",
        lastCfi: epub.lastCfi || undefined,
        progressPercent: epub.progressPercent || image.progressPercent || 0,
        lastPage: image.lastPage,
        lastReadAt: epub.lastReadAt || image.lastReadAt,
      };
      const currentSection = getCurrentSection(volume, baseProgress);

      return {
        ...baseProgress,
        currentSectionId: currentSection?.id,
        currentSectionTitle: currentSection?.title,
      };
    }

    const image = imageProgress.progress;
    const epub = epubProgress.progress;
    const baseProgress: UnifiedProgress = {
      format: "image",
      lastPage: image.lastPage,
      progressPercent: image.progressPercent || epub.progressPercent || 0,
      lastCfi: epub.lastCfi,
      lastReadAt: image.lastReadAt || epub.lastReadAt,
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
  };
}
