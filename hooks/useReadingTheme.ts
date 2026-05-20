import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "shifa-shareef:reading-theme";

export type ReadingTheme = "light" | "sepia" | "night";

export const THEME_COLORS = {
  light: {
    background: "#FBF7EE",
    text: "#173D31",
  },
  sepia: {
    background: "#E8D5B7",
    text: "#4A3520",
  },
  night: {
    background: "#1A1A1A",
    text: "#E8E8E8",
  },
} as const;

export function useReadingTheme() {
  const [theme, setTheme] = useState<ReadingTheme>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "light" || stored === "sepia" || stored === "night")) {
        setTheme(stored);
      }
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadTheme();
  }, []);

  const changeTheme = async (newTheme: ReadingTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem(STORAGE_KEY, newTheme);
  };

  const cycleTheme = async () => {
    const themes: ReadingTheme[] = ["light", "sepia", "night"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    await changeTheme(themes[nextIndex]);
  };

  return {
    theme,
    isLoaded,
    changeTheme,
    cycleTheme,
    colors: THEME_COLORS[theme],
  };
}
