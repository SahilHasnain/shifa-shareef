import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import { LANGUAGES } from "../../data/languages";
import type { AppThemePreference, Language, Volume } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import {
  cancelVolumeDownload,
  downloadVolume,
  getVolumeDownloadState,
  removeVolumeDownload,
  type VolumeDownloadState,
} from "../../lib/volume-download-service";

const SELECTED_FILL = "#F1E0A4";
const SELECTED_TEXT = "#101815";

function getThemeLabel(theme: AppThemePreference) {
  if (theme === "system") return "System";
  return theme === "dark" ? "Dark" : "Light";
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

function downloadsKey(languageId: string, volumeId: string): string {
  return `${languageId}:${volumeId}`;
}

function DownloadsSection() {
  const { colors, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.08)" : "transparent";
  const rowBackground = isDark ? "rgba(26, 37, 32, 0.58)" : colors.surface.softBeige;
  const rowBorderColor = isDark ? "rgba(255, 255, 255, 0.05)" : "transparent";

  const [states, setStates] = useState<Record<string, VolumeDownloadState>>({});
  const [inflight, setInflight] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});

  const refreshStates = useCallback(async () => {
    const next: Record<string, VolumeDownloadState> = {};
    for (const language of LANGUAGES) {
      for (const volume of language.volumes) {
        next[downloadsKey(language.id, volume.id)] = await getVolumeDownloadState(
          language.id,
          volume.id,
        );
      }
    }
    setStates(next);
  }, []);

  useEffect(() => {
    void refreshStates();
  }, [refreshStates]);

  const handleDownload = async (languageId: string, volumeId: string) => {
    const key = downloadsKey(languageId, volumeId);
    setInflight((prev) => ({ ...prev, [key]: true }));
    setProgress((prev) => ({ ...prev, [key]: 0 }));

    try {
      const result = await downloadVolume(languageId, volumeId, (event) => {
        setProgress((prev) => ({
          ...prev,
          [key]: event.total > 0 ? event.completed / event.total : 1,
        }));
      });
      if (!result.ok && result.reason !== "cancelled") {
        Alert.alert(
          "Download incomplete",
          `Only ${result.completed} of ${result.total} sections downloaded. Please retry.`,
        );
      }
    } catch {
      Alert.alert("Download failed", "Please check your connection and try again.");
    } finally {
      setInflight((prev) => ({ ...prev, [key]: false }));
      await refreshStates();
    }
  };

  const handleRemove = (languageId: string, volumeId: string) => {
    Alert.alert(
      "Remove Download",
      "This removes the offline book content for this language. You can download it again anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeVolumeDownload(languageId, volumeId);
            await refreshStates();
          },
        },
      ],
    );
  };

  const handlePress = (languageId: string, volumeId: string) => {
    const key = downloadsKey(languageId, volumeId);
    if (inflight[key]) {
      cancelVolumeDownload(languageId, volumeId);
      return;
    }
    if (states[key]?.status === "complete") {
      handleRemove(languageId, volumeId);
      return;
    }
    void handleDownload(languageId, volumeId);
  };

  const rows: { language: Language; volume: Volume; key: string }[] = [];
  for (const language of LANGUAGES) {
    for (const volume of language.volumes) {
      rows.push({ language, volume, key: downloadsKey(language.id, volume.id) });
    }
  }

  return (
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
          Content
        </Text>
        <Text
          style={{
            color: colors.text.primary,
            fontSize: typography.size.xl,
            fontWeight: typography.weight.extrabold,
          }}
        >
          Book Downloads
        </Text>
        <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm, marginTop: 2 }}>
          Download a language to read it fully offline.
        </Text>
      </View>

      {rows.map(({ language, volume, key }) => {
        const state = states[key];
        const isDownloading = Boolean(inflight[key]);
        const fraction = progress[key] ?? 0;

        const statusLabel = isDownloading
          ? `Downloading ${Math.round(fraction * 100)}%`
          : state?.status === "complete"
            ? "Downloaded"
            : state?.status === "partial"
              ? `Partial (${state.cachedChapters}/${state.totalChapters ?? "?"} chapters)`
              : "Not downloaded";

        const actionLabel = isDownloading
          ? "Cancel"
          : state?.status === "complete"
            ? "Remove"
            : "Download";

        return (
          <View
            key={key}
            style={{
              backgroundColor: rowBackground,
              borderRadius: 16,
              borderWidth: isDark ? 1 : 0,
              borderColor: rowBorderColor,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  {language.title}
                </Text>
                {language.volumes.length > 1 && (
                  <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm }}>
                    {volume.title}
                  </Text>
                )}
                <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm, marginTop: 2 }}>
                  {statusLabel}
                </Text>
              </View>

              <Pressable
                onPress={() => handlePress(language.id, volume.id)}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  backgroundColor:
                    state?.status === "complete" && !isDownloading
                      ? isDark
                        ? "rgba(220, 38, 38, 0.15)"
                        : "rgba(220, 38, 38, 0.1)"
                      : isDark
                        ? colors.surface.softBeige
                        : colors.secondary.lightGold,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.82 : 1,
                })}
              >
                <Text
                  style={{
                    color:
                      state?.status === "complete" && !isDownloading
                        ? "#dc2626"
                        : isDark
                          ? colors.secondary.lightGold
                          : colors.primary.deepGreen,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  {actionLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="cloud-done-outline" size={16} color={colors.text.tertiary} />
        <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm, flex: 1 }}>
          Your preferred language is downloaded automatically as you read.
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme, themePreference, setThemePreference } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const screenBackground = isDark ? "#0B100D" : colors.surface.lightCream;
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.08)" : "transparent";

  const handleClearAllProgress = async () => {
    Alert.alert(
      "Clear All Reading Progress",
      "This will clear all resume reading progress for all languages and volumes. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const progressKeys = keys.filter(
                (key) =>
                  key.startsWith("shifa-shareef:epub-progress-") ||
                  key.startsWith("shifa-shareef:reading-progress-")
              );

              if (progressKeys.length > 0) {
                await AsyncStorage.multiRemove(progressKeys);
                Alert.alert("Success", `Cleared ${progressKeys.length} reading progress entries.`);
              } else {
                Alert.alert("Info", "No reading progress found to clear.");
              }
            } catch {
              Alert.alert("Error", "Failed to clear reading progress.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 5,
          paddingHorizontal: 20,
          gap: 16,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
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

        <DownloadsSection />

        {/* Dev Mode Section */}
        {__DEV__ && (
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
                Developer Tools
              </Text>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size.xl,
                  fontWeight: typography.weight.extrabold,
                }}
              >
                Dev Mode
              </Text>
            </View>

            <Pressable
              onPress={handleClearAllProgress}
              style={({ pressed }) => ({
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(220, 38, 38, 0.15)" : "rgba(220, 38, 38, 0.1)",
                borderWidth: 1.5,
                borderColor: "#dc2626",
                paddingHorizontal: 16,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: "#dc2626",
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.extrabold,
                }}
              >
                Clear All Reading Progress
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
