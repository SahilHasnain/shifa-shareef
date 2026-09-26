import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
import { useFonts, NotoNastaliqUrdu_400Regular } from "@expo-google-fonts/noto-nastaliq-urdu";

import { AppThemeProvider, useAppTheme } from "../hooks/useAppTheme";
import { useMultiVolumeMigration } from "../hooks/useMultiVolumeMigration";

const SQLITE_RELOAD_ATTEMPTS_KEY = "shifa-shareef:sqlite-reload-attempts";

function isOpfsHandleContentionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /NoModificationAllowedError|another open Access Handle|open Access Handle/i.test(error.message);
}

// expo-sqlite's web driver stores the bundled DB in OPFS via an Access Handle. If a previous
// document (e.g. a bfcache'd tab) still holds that handle, opening the DB throws
// NoModificationAllowedError. A full reload tears the stale worker down, so retry a bounded
// number of times before falling back to the default (surface the error).
function handleSqliteError(error: unknown) {
  if (Platform.OS !== "web" || !isOpfsHandleContentionError(error)) throw error;

  try {
    const attempts = Number(window.sessionStorage.getItem(SQLITE_RELOAD_ATTEMPTS_KEY) ?? "0");
    if (attempts >= 2) {
      window.sessionStorage.removeItem(SQLITE_RELOAD_ATTEMPTS_KEY);
      throw error;
    }
    window.sessionStorage.setItem(SQLITE_RELOAD_ATTEMPTS_KEY, String(attempts + 1));
  } catch {
    throw error;
  }

  window.location.reload();
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NotoNastaliqUrdu_400Regular });
  useMultiVolumeMigration();

  if (!fontsLoaded) return null;

  return (
    <SQLiteProvider
      databaseName="shifa-shareef-content-v2.db"
      assetSource={{ assetId: require("../assets/db/shifa-shareef.db") }}
      onError={handleSqliteError}
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
