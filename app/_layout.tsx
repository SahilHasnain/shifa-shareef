import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider, useAppTheme } from "../hooks/useAppTheme";
import { useMultiVolumeMigration } from "../hooks/useMultiVolumeMigration";

export default function RootLayout() {
  useMultiVolumeMigration();

  return (
    <SQLiteProvider
      databaseName="shifa-shareef.db"
      assetSource={{ assetId: require("../assets/db/shifa-shareef.db") }}
    >
      <AppThemeProvider>
        <ThemedRootLayout />
      </AppThemeProvider>
    </SQLiteProvider>
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
