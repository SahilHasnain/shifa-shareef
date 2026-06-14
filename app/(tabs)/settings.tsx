import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import { getVolumeDisplayTitle, shouldShowVolumeLabel } from "../../data/languages";
import type { AppThemePreference } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useVolumeProgress } from "../../hooks/useVolumeProgress";
import { getProgressPercent } from "../../lib/progress";
import { resetVolumeReadingProgress } from "../../lib/progress-storage";

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme, themePreference, setThemePreference } = useAppTheme();
  const { currentLanguage, currentLanguageId } = useCurrentLanguage();
  const { currentVolume, currentVolumeId } = useCurrentVolume(currentLanguageId);
  const { progress, isLoaded: isProgressLoaded } = useVolumeProgress(
    currentVolumeId,
    currentLanguageId,
  );
  const isDark = resolvedTheme === "dark";
  const screenBackground = isDark ? "#0B100D" : colors.surface.lightCream;
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.08)" : "transparent";
  const volumeDisplayTitle = getVolumeDisplayTitle(
    currentLanguageId,
    currentVolumeId,
    currentVolume.title,
  );
  const volumeTitle = shouldShowVolumeLabel(currentLanguageId)
    ? `${currentLanguage.title} • ${volumeDisplayTitle}`
    : currentLanguage.title;

  const handleResetReadingProgress = () => {
    Alert.alert(
      "Reset reading progress?",
      `This clears resume position for ${volumeTitle}. Your plan, streak, sessions, and bookmarks stay unchanged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void resetVolumeReadingProgress(currentLanguageId, currentVolumeId);
          },
        },
      ],
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
              Reading Progress
            </Text>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.lg,
                fontWeight: typography.weight.extrabold,
              }}
            >
              {volumeTitle}
            </Text>
          </View>

          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.sm,
              lineHeight: 18,
            }}
          >
            EPUB is the only reading format.
            {isProgressLoaded
              ? ` Currently at ${Math.round(getProgressPercent(progress) * 100)}%.`
              : ""}
          </Text>

          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.sm,
              lineHeight: 18,
            }}
          >
            Reset only the saved resume position for this volume. Plans, streak, sessions, and bookmarks are kept.
          </Text>

          <Pressable
            onPress={handleResetReadingProgress}
            style={({ pressed }) => ({
              borderRadius: 999,
              backgroundColor: isDark
                ? "rgba(241, 224, 164, 0.12)"
                : colors.surface.softBeige,
              paddingHorizontal: 16,
              paddingVertical: 11,
              alignItems: "center",
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.bold,
              }}
            >
              Reset resume position
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
