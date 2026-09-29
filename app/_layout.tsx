import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { useFonts, NotoNastaliqUrdu_400Regular } from "@expo-google-fonts/noto-nastaliq-urdu";

import { appThemes } from "../constants/theme";
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

function SplashLoadingScreen() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === "dark";
  const backgroundColor = isDark
    ? appThemes.dark.surface.lightCream
    : appThemes.light.surface.lightCream;
  const spinnerColor = isDark
    ? appThemes.dark.secondary.warmGold
    : appThemes.light.primary.deepGreen;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ActivityIndicator size="large" color={spinnerColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Signals that the SQLiteProvider has finished opening the database. Because the provider
// only mounts its children once the DB is ready, this component mounts exactly when the
// bootstrap is complete, letting us hide the loading overlay.
function SqliteReadyNotifier({ onReady }: { onReady: () => void }) {
  useSQLiteContext();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    onReady();
  }, [onReady]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NotoNastaliqUrdu_400Regular });
  useMultiVolumeMigration();
  const [isDbReady, setIsDbReady] = useState(false);
  const handleDbReady = useCallback(() => setIsDbReady(true), []);

  if (!fontsLoaded) return <SplashLoadingScreen />;

  return (
    <View style={{ flex: 1 }}>
      <SQLiteProvider
        databaseName="shifa-shareef-content-v2.db"
        assetSource={{ assetId: require("../assets/db/shifa-shareef.db") }}
        onError={handleSqliteError}
      >
        <AppThemeProvider>
          <ThemedRootLayout />
        </AppThemeProvider>
        <SqliteReadyNotifier onReady={handleDbReady} />
      </SQLiteProvider>
      {!isDbReady ? <SplashLoadingScreen /> : null}
    </View>
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
