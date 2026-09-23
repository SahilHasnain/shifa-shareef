import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import type { AppThemePreference } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";

const selectedFill = "#F1E0A4";
const selectedText = "#101815";

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
  const dark = resolvedTheme === "dark";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? selectedFill : colors.surface.softBeige,
        backgroundColor: selected
          ? dark ? colors.surface.softBeige : selectedFill
          : colors.surface.softBeige,
        paddingHorizontal: 12,
        paddingVertical: 11,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? dark ? selectedFill : selectedText : colors.text.primary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.extrabold,
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
  const dark = resolvedTheme === "dark";
  const cardStyle = {
    backgroundColor: dark ? "#1A2520" : colors.surface.warmIvory,
    borderRadius: 24,
    borderWidth: dark ? 1 : 0,
    borderColor: "rgba(241, 224, 164, 0.08)",
    padding: 20,
    gap: 14,
    ...shadows.sm,
  } as const;

  const clearProgress = () => {
    Alert.alert(
      "Clear All Reading Progress",
      "This clears saved reading progress for all books. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const progressKeys = keys.filter((key) =>
                key.startsWith("shifa-shareef:epub-progress-") ||
                key.startsWith("shifa-shareef:reading-progress-"),
              );
              await AsyncStorage.multiRemove(progressKeys);
              Alert.alert("Success", "Reading progress cleared.");
            } catch {
              Alert.alert("Error", "Failed to clear reading progress.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: dark ? "#0B100D" : colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 5,
          paddingHorizontal: 20,
          paddingBottom: 40,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.text.primary,
            fontSize: typography.size["4xl"],
            fontWeight: typography.weight.extrabold,
          }}
        >
          Settings
        </Text>

        <View style={cardStyle}>
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
            <ThemeOption label="System" selected={themePreference === "system"} onPress={() => void setThemePreference("system")} />
            <ThemeOption label="Light" selected={themePreference === "light"} onPress={() => void setThemePreference("light")} />
            <ThemeOption label="Dark" selected={themePreference === "dark"} onPress={() => void setThemePreference("dark")} />
          </View>
        </View>

        <View style={cardStyle}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size.base,
              fontWeight: typography.weight.extrabold,
            }}
          >
            Book content
          </Text>
          <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm, lineHeight: 20 }}>
            The available books are included in the app and can be read offline.
          </Text>
        </View>

        {__DEV__ ? (
          <View style={cardStyle}>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.xl,
                fontWeight: typography.weight.extrabold,
              }}
            >
              Developer Tools
            </Text>
            <Pressable
              onPress={clearProgress}
              style={({ pressed }) => ({
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#dc2626",
                backgroundColor: dark ? "rgba(220, 38, 38, 0.15)" : "rgba(220, 38, 38, 0.1)",
                paddingHorizontal: 16,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: "#dc2626", fontSize: typography.size.sm, fontWeight: typography.weight.extrabold }}>
                Clear All Reading Progress
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
