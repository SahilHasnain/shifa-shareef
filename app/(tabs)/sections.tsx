import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../../constants/theme";
import { getVolumeDisplayTitle, shouldShowVolumeLabel } from "../../data/languages";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingProgress } from "../../hooks/useReadingProgress";
import { useVolumeDownload } from "../../hooks/useVolumeDownload";

export default function SectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentLanguage, currentLanguageId } = useCurrentLanguage();
  const { currentVolume, currentVolumeId } = useCurrentVolume(currentLanguageId);
  const { progress } = useReadingProgress(currentVolumeId, currentLanguageId);
  const showVolumeLabel = shouldShowVolumeLabel(currentLanguageId);
  const currentVolumeDisplayTitle = getVolumeDisplayTitle(
    currentLanguageId,
    currentVolumeId,
    currentVolume.title,
  );
  const {
    canDownload,
    downloadAll,
    isDownloading,
    isFullyDownloaded,
    isPartiallyDownloaded,
    progressPercent,
    removeDownload,
  } = useVolumeDownload(
    currentLanguageId,
    currentVolumeId,
    currentVolume.totalPages,
  );

  const getSectionStatus = (section: (typeof currentVolume.sections)[number]) => {
    if (!progress) return "unread";
    const { lastPage } = progress;
    if (lastPage > section.endPage) return "completed";
    if (lastPage >= section.startPage && lastPage <= section.endPage) return "current";
    return "unread";
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 5, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            Sections
          </Text>
          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.md,
              lineHeight: 22,
              marginTop: 6,
            }}
          >
            {showVolumeLabel
              ? `${currentLanguage.title} • ${currentVolumeDisplayTitle}`
              : currentLanguage.title}
          </Text>

          <View
            style={{
              marginTop: 16,
              borderRadius: 18,
              backgroundColor: "#F5E9C9",
              padding: 16,
              gap: 10,
            }}
          >
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.bold,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Offline access
            </Text>
            <Text
              style={{
                color: colors.text.secondary,
                fontSize: typography.size.base,
                lineHeight: 22,
              }}
            >
              {!canDownload
                ? "This volume is currently included in the app."
                : isDownloading
                  ? `Downloading pages for offline reading (${progressPercent}%).`
                  : isFullyDownloaded
                    ? "This volume is fully available offline."
                    : isPartiallyDownloaded
                      ? `Partially downloaded (${progressPercent}%).`
                      : "Download this volume to read fully offline."}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {canDownload && !isFullyDownloaded ? (
                <Pressable
                  onPress={() => {
                    void downloadAll();
                  }}
                  disabled={isDownloading}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    backgroundColor: colors.primary.deepGreen,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    opacity: pressed && !isDownloading ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: "#FFF9EA",
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.bold,
                    }}
                  >
                    {isDownloading ? "Downloading..." : "Download volume"}
                  </Text>
                </Pressable>
              ) : null}

              {canDownload && (isFullyDownloaded || isPartiallyDownloaded) && !isDownloading ? (
                <Pressable
                  onPress={() => {
                    void removeDownload();
                  }}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    backgroundColor: "rgba(23, 61, 49, 0.08)",
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: colors.text.primary,
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.bold,
                    }}
                  >
                    Remove download
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 2 }}>
          {currentVolume.sections.map((section, index) => {
            const status = getSectionStatus(section);
            const isCurrent = status === "current";
            const isCompleted = status === "completed";

            return (
              <Pressable
                key={section.id}
                onPress={() =>
                  router.push(
                    `/reader/${currentLanguageId}/${currentVolumeId}/${section.startPage}` as any,
                  )
                }
                style={({ pressed }) => ({
                  backgroundColor: isCurrent ? "#F8F0D8" : "transparent",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: isCurrent
                      ? colors.primary.deepGreen
                      : isCompleted
                        ? colors.accent.success
                        : "rgba(23, 61, 49, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: isCurrent ? "#FFFFFF" : colors.text.primary,
                        fontSize: typography.size.xl,
                        fontWeight: typography.weight.extrabold,
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: colors.text.primary,
                      fontSize: typography.size.lg,
                      fontWeight: typography.weight.bold,
                      lineHeight: 22,
                    }}
                  >
                    {section.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.size.sm,
                        fontWeight: typography.weight.medium,
                      }}
                    >
                      Pages {section.startPage}-{section.endPage}
                    </Text>
                    <View
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: colors.text.tertiary,
                      }}
                    />
                    <Text
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.size.sm,
                        fontWeight: typography.weight.medium,
                      }}
                    >
                      {section.estimatedMinutes} min
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text.tertiary}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
