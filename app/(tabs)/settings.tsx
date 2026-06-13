import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import { getVolumeDisplayTitle, shouldShowVolumeLabel } from "../../data/languages";
import type { AppThemePreference } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingFormatPreference } from "../../hooks/useReadingFormatPreference";
import { useResolvedVolume } from "../../hooks/useResolvedVolume";
import { useVolumeDownload } from "../../hooks/useVolumeDownload";
import {
  getReadingFormatLabel,
  getReadingFormatStatusMessage,
} from "../../lib/reading-format-resolver";

const SELECTED_FILL = "#F1E0A4";
const SELECTED_TEXT = "#101815";

function getThemeLabel(theme: AppThemePreference) {
  if (theme === "system") return "System";
  return theme === "dark" ? "Dark" : "Light";
}

function getDownloadStatusLabel({
  canDownload,
  deliveryMode,
  isDownloading,
  isFullyDownloaded,
  isPartiallyDownloaded,
}: {
  canDownload: boolean;
  deliveryMode: "bundled" | "remote" | "hybrid";
  isDownloading: boolean;
  isFullyDownloaded: boolean;
  isPartiallyDownloaded: boolean;
}) {
  if (deliveryMode === "bundled" && !canDownload) {
    return "Included";
  }

  if (isDownloading) {
    return "Downloading";
  }

  if (isFullyDownloaded) {
    return "Ready offline";
  }

  if (isPartiallyDownloaded) {
    return "Partially cached";
  }

  return "Online only";
}

function FormatOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, resolvedTheme } = useAppTheme();
  const selectedBackground = resolvedTheme === "dark" ? colors.surface.softBeige : SELECTED_FILL;
  const selectedText = resolvedTheme === "dark" ? SELECTED_FILL : SELECTED_TEXT;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 999,
        backgroundColor: selected ? selectedBackground : colors.surface.softBeige,
        borderWidth: 1.5,
        borderColor: selected ? SELECTED_FILL : colors.surface.softBeige,
        paddingHorizontal: 14,
        paddingVertical: 11,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? selectedText : colors.text.primary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.extrabold,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ThemeOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, resolvedTheme } = useAppTheme();
  const selectedBackground = resolvedTheme === "dark" ? colors.surface.softBeige : SELECTED_FILL;
  const selectedText = resolvedTheme === "dark" ? SELECTED_FILL : SELECTED_TEXT;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 999,
        backgroundColor: selected ? selectedBackground : colors.surface.softBeige,
        borderWidth: 1.5,
        borderColor: selected ? SELECTED_FILL : colors.surface.softBeige,
        paddingHorizontal: 14,
        paddingVertical: 11,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? selectedText : colors.text.primary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.extrabold,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme, themePreference, setThemePreference } = useAppTheme();
  const { currentLanguage, currentLanguageId } = useCurrentLanguage();
  const { currentVolume, currentVolumeId } = useCurrentVolume(currentLanguageId);
  const resolvedVolume = useResolvedVolume(currentLanguageId, currentVolumeId);
  const { preference: readingFormatPreference, setPreference: setReadingFormatPreference } =
    useReadingFormatPreference();
  const {
    canDownload,
    deliveryMode,
    downloadAll,
    isDownloading,
    isFullyDownloaded,
    isPartiallyDownloaded,
    progressPercent,
    removeDownload,
  } = useVolumeDownload(currentLanguageId, currentVolumeId, currentVolume.totalPages);
  const isDark = resolvedTheme === "dark";
  const screenBackground = isDark ? "#0B100D" : colors.surface.lightCream;
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const compactCardBackground = isDark ? "rgba(26, 37, 32, 0.6)" : colors.surface.warmIvory;
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.08)" : "transparent";
  const selectedBackground = isDark ? colors.surface.softBeige : SELECTED_FILL;
  const selectedText = isDark ? SELECTED_FILL : SELECTED_TEXT;
  const volumeDisplayTitle = getVolumeDisplayTitle(
    currentLanguageId,
    currentVolumeId,
    currentVolume.title,
  );
  const offlineTitle = shouldShowVolumeLabel(currentLanguageId)
    ? `${currentLanguage.title} • ${volumeDisplayTitle}`
    : currentLanguage.title;
  const downloadStatusLabel = getDownloadStatusLabel({
    canDownload,
    deliveryMode,
    isDownloading,
    isFullyDownloaded,
    isPartiallyDownloaded,
  });
  const downloadButtonLabel = canDownload
    ? isFullyDownloaded
      ? "Remove download"
      : isDownloading
        ? "Downloading..."
        : "Download volume"
    : "Included";
  const readingFormatStatusMessage = getReadingFormatStatusMessage(
    readingFormatPreference,
    resolvedVolume,
  );
  const activeReadingFormatLabel = getReadingFormatLabel(resolvedVolume.format);

  return (
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 5,
          paddingHorizontal: 20,
          gap: 16,
          paddingBottom: 40,
        }}
      >
        <View style={{ marginBottom: 4 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            Settings
          </Text>
        </View>

        {/* Appearance - Prominent */}
        <View
          style={{
            backgroundColor: cardBackground,
            borderRadius: 24,
            borderWidth: isDark ? 1 : 0,
            borderColor: cardBorderColor,
            padding: 20,
            gap: 14,
            ...shadows.sm,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: colors.secondary.mutedGold,
                fontSize: typography.size.xs,
                fontWeight: typography.weight.bold,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Appearance
            </Text>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.xl,
                fontWeight: typography.weight.extrabold,
              }}
            >
              {getThemeLabel(themePreference)}
              {themePreference === "system" ? ` (${getThemeLabel(resolvedTheme)})` : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <ThemeOption
              label="System"
              selected={themePreference === "system"}
              onPress={() => void setThemePreference("system")}
            />
            <ThemeOption
              label="Light"
              selected={themePreference === "light"}
              onPress={() => void setThemePreference("light")}
            />
            <ThemeOption
              label="Dark"
              selected={themePreference === "dark"}
              onPress={() => void setThemePreference("dark")}
            />
          </View>
        </View>

        {/* Reading Format - Compact */}
        <View
          style={{
            backgroundColor: cardBackground,
            borderRadius: 20,
            borderWidth: isDark ? 1 : 0,
            borderColor: cardBorderColor,
            padding: 18,
            gap: 12,
            ...shadows.sm,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: colors.secondary.mutedGold,
                fontSize: typography.size.xs,
                fontWeight: typography.weight.bold,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Reading Format
            </Text>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.lg,
                fontWeight: typography.weight.extrabold,
              }}
            >
              {getReadingFormatLabel(readingFormatPreference)}
              {activeReadingFormatLabel !== getReadingFormatLabel(readingFormatPreference)
                ? ` (Using ${activeReadingFormatLabel})`
                : ""}
            </Text>
          </View>

          {readingFormatStatusMessage ? (
            <Text
              style={{
                color: colors.text.tertiary,
                fontSize: typography.size.sm,
                lineHeight: 18,
              }}
            >
              {readingFormatStatusMessage}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <FormatOption
              label="EPUB"
              selected={readingFormatPreference === "epub"}
              onPress={() => void setReadingFormatPreference("epub")}
            />
            <FormatOption
              label="PDF"
              selected={readingFormatPreference === "image"}
              onPress={() => void setReadingFormatPreference("image")}
            />
          </View>
        </View>

        {/* Offline Reading - Most Compact */}
        <View
          style={{
            backgroundColor: compactCardBackground,
            borderRadius: 18,
            borderWidth: isDark ? 1 : 0,
            borderColor: cardBorderColor,
            padding: 16,
            gap: 12,
            ...(isDark ? {} : shadows.sm),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark
                  ? "rgba(241, 224, 164, 0.12)"
                  : colors.surface.softBeige,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="cloud-download-outline"
                size={18}
                color={colors.secondary.mutedGold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.secondary.mutedGold,
                  fontSize: typography.size.xs,
                  fontWeight: typography.weight.bold,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Offline Reading
              </Text>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.bold,
                  marginTop: 2,
                }}
              >
                {offlineTitle}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.semibold,
                }}
              >
                {downloadStatusLabel}
              </Text>
              <Text
                style={{
                  color: colors.secondary.mutedGold,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.bold,
                }}
              >
                {canDownload ? `${progressPercent}%` : ""}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 999,
                backgroundColor: isDark
                  ? "rgba(241, 224, 164, 0.10)"
                  : "rgba(201, 169, 97, 0.16)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${canDownload ? progressPercent : 100}%`,
                  borderRadius: 999,
                  backgroundColor: colors.secondary.mutedGold,
                }}
              />
            </View>
          </View>

          {canDownload && (
            <Pressable
              onPress={() => {
                if (isFullyDownloaded) {
                  void removeDownload();
                } else {
                  void downloadAll();
                }
              }}
              disabled={isDownloading}
              style={({ pressed }) => ({
                borderRadius: 999,
                backgroundColor:
                  !isFullyDownloaded
                    ? selectedBackground
                    : isDark
                      ? "rgba(241, 224, 164, 0.12)"
                      : colors.surface.softBeige,
                paddingHorizontal: 16,
                paddingVertical: 11,
                alignItems: "center",
                opacity: pressed ? 0.82 : isDownloading ? 0.65 : 1,
              })}
            >
              <Text
                style={{
                  color: !isFullyDownloaded ? selectedText : colors.text.primary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.extrabold,
                }}
              >
                {downloadButtonLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
