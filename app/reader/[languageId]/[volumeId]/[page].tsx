import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { ChapterReader } from "../../../../components/readers/ChapterReader";
import {
  getLanguageById,
  getVolumeByLanguageAndId,
  getVolumeDisplayTitle,
  shouldShowVolumeLabel,
} from "../../../../data/languages";
import { useCurrentLanguage } from "../../../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../../../hooks/useCurrentVolume";
import { useReadingProgress } from "../../../../hooks/useReadingProgress";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function ReaderScreen() {
  const params = useLocalSearchParams<{
    languageId?: string;
    volumeId?: string;
    cfi?: string;
    progressPercent?: string;
  }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const language = getLanguageById(params.languageId);
  const volume = getVolumeByLanguageAndId(language.id, params.volumeId);
  const requestedLanguageId = Array.isArray(params.languageId) ? params.languageId[0] : params.languageId;
  const requestedVolumeId = Array.isArray(params.volumeId) ? params.volumeId[0] : params.volumeId;
  const bookUnavailable =
    (requestedLanguageId != null && requestedLanguageId !== language.id) ||
    (requestedVolumeId != null && requestedVolumeId !== volume.id);
  const showVolumeLabel = shouldShowVolumeLabel(language.id);
  const volumeDisplayTitle = getVolumeDisplayTitle(language.id, volume.id, volume.title);
  const { switchLanguage } = useCurrentLanguage();
  const { switchVolume } = useCurrentVolume(language.id);
  const { progress, saveProgress } = useReadingProgress(volume.id, language.id);

  const handleProgressChange = useCallback(
    (locator: string, nextProgressPercent: number) => {
      void saveProgress(locator, nextProgressPercent);
    },
    [saveProgress],
  );

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
    if (bookUnavailable) return;
    void switchLanguage(language.id);
    void switchVolume(volume.id);
  }, [bookUnavailable, language.id, switchLanguage, switchVolume, volume.id]);

  if (bookUnavailable) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.lightCream, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: "800", textAlign: "center" }}>
          This edition is not included yet
        </Text>
        <Text style={{ color: colors.text.tertiary, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 8 }}>
          More languages and volumes will be available when their content is added to the app.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, borderRadius: 999, backgroundColor: colors.primary.deepGreen, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: colors.text.onPrimary, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ChapterReader
      language={language}
      volume={volume}
      volumeDisplayTitle={volumeDisplayTitle}
      showVolumeLabel={showVolumeLabel}
      initialLocator={
        navigationCfi ?? (hasExplicitNavigation ? undefined : progress.lastCfi)
      }
      initialProgressPercent={navigationProgressPercent ?? progress.progressPercent}
      onProgressChange={handleProgressChange}
    />
  );
}
