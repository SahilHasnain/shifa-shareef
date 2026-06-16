import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import type { AppThemePreference } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";

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
            } catch (error) {
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
