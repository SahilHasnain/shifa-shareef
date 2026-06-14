import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

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
import { getEpubUrl } from "../../../../lib/epub-url";
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
      onProgressChange={(cfi, nextProgressPercent) => {
        void saveProgress(cfi, nextProgressPercent);
      }}
    />
  );
}
