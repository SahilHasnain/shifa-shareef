import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";

import { useAppTheme } from "../../hooks/useAppTheme";

const SIDEBAR_WIDTH = 224;
const SIDEBAR_COMPACT_BREAKPOINT = 640;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const { colors, resolvedTheme } = useAppTheme();

  const useFullSidebar = width >= SIDEBAR_COMPACT_BREAKPOINT;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: "left",
        tabBarActiveTintColor:
          resolvedTheme === "dark" ? colors.secondary.lightGold : colors.primary.deepGreen,
        tabBarInactiveTintColor: colors.text.subtle,
        tabBarStyle: {
          backgroundColor: colors.surface.warmIvory,
          borderRightColor: colors.surface.softBeige,
          ...(useFullSidebar ? { minWidth: SIDEBAR_WIDTH } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 15,
          fontWeight: "600",
        },
        sceneStyle: {
          backgroundColor: colors.surface.lightCream,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sections"
        options={{
          title: "Topics",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: "Listen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}