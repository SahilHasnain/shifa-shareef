import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { ChapterReader } from "../../../../components/readers/ChapterReader";
import { EpubReader } from "../../../../components/readers/EpubReader";
import {
  getLanguageById,
  getVolumeByLanguageAndId,
  getVolumeDisplayTitle,
  shouldShowVolumeLabel,
} from "../../../../data/languages";
import { useCurrentLanguage } from "../../../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../../../hooks/useCurrentVolume";
import { useReadingProgress } from "../../../../hooks/useReadingProgress";
import { getChapterAssetBaseUrl, getChapterManifestUrl, getEpubUrl } from "../../../../lib/epub-url";
import { clearLegacyReadingStorage } from "../../../../lib/progress-storage";

export default function ReaderScreen() {
  const params = useLocalSearchParams<{
    languageId?: string;
    volumeId?: string;
    cfi?: string;
    progressPercent?: string;
  }>();
  const language = getLanguageById(params.languageId);
  const volume = getVolumeByLanguageAndId(language.id, params.volumeId);
  const showVolumeLabel = shouldShowVolumeLabel(language.id);
  const volumeDisplayTitle = getVolumeDisplayTitle(language.id, volume.id, volume.title);
  const { switchLanguage } = useCurrentLanguage();
  const { switchVolume } = useCurrentVolume(language.id);
  const { progress, saveProgress } = useReadingProgress(volume.id, language.id);
  const [useEpubFallback, setUseEpubFallback] = useState(false);

  const handleProgressChange = useCallback(
    (locator: string, nextProgressPercent: number) => {
      void saveProgress(locator, nextProgressPercent);
    },
    [saveProgress],
  );

  const handleFallbackRequested = useCallback(() => {
    setUseEpubFallback(true);
  }, []);

  const navigationCfi =
    typeof params.cfi === "string" && params.cfi.length > 0
      ? params.cfi
      : undefined;
  const navigationProgressPercent =
    typeof params.progressPercent === "string" &&
    params.progressPercent.length > 0
      ? Number(params.progressPercent)
      : undefined;
  const hasExplicitNavigation =
    navigationCfi != null ||
    (navigationProgressPercent != null && !Number.isNaN(navigationProgressPercent));

  useEffect(() => {
    void switchLanguage(language.id);
    void switchVolume(volume.id);
  }, [language.id, switchLanguage, switchVolume, volume.id]);

  useEffect(() => {
    void clearLegacyReadingStorage();
  }, []);

  if (!useEpubFallback) {
    return (
      <ChapterReader
        language={language}
        volume={volume}
        volumeDisplayTitle={volumeDisplayTitle}
        showVolumeLabel={showVolumeLabel}
        manifestUrl={getChapterManifestUrl(language.id, volume.id)}
        assetBaseUrl={getChapterAssetBaseUrl(language.id, volume.id)}
        initialLocator={
          navigationCfi ?? (hasExplicitNavigation ? undefined : progress.lastCfi)
        }
        initialProgressPercent={
          navigationCfi == null
            ? navigationProgressPercent ?? (hasExplicitNavigation ? undefined : progress.progressPercent)
            : undefined
        }
        onProgressChange={handleProgressChange}
        onFallbackRequested={handleFallbackRequested}
      />
    );
  }

  return (
    <EpubReader
      language={language}
      volume={volume}
      volumeDisplayTitle={volumeDisplayTitle}
      showVolumeLabel={showVolumeLabel}
      epubUrl={getEpubUrl(language.id, volume.id)}
      initialCfi={
        navigationCfi ?? (hasExplicitNavigation ? undefined : progress.lastCfi)
      }
      initialProgressPercent={
        navigationCfi == null ? navigationProgressPercent : undefined
      }
      onProgressChange={handleProgressChange}
    />
  );
}
