import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useMultiVolumeMigration } from "../hooks/useMultiVolumeMigration";

export default function RootLayout() {
  useMultiVolumeMigration();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="reader/[volumeId]/[page]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reader/[page]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="plans/index"
          options={{ animation: "slide_from_bottom" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
