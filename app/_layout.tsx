import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider, useAppTheme } from "../hooks/useAppTheme";
import { useAutoDownload } from "../hooks/useAutoDownload";
import { useMultiVolumeMigration } from "../hooks/useMultiVolumeMigration";

export default function RootLayout() {
  useMultiVolumeMigration();
  useAutoDownload();

  return (
    <AppThemeProvider>
      <ThemedRootLayout />
    </AppThemeProvider>
  );
}

function ThemedRootLayout() {
  const { colors, resolvedTheme } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <StatusBar
        style={resolvedTheme === "dark" ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface.lightCream },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="reader/[languageId]/[volumeId]/[page]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reader/[volumeId]/[page]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reader/[page]"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
