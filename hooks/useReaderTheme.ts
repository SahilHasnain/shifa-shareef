import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { ReaderTheme } from "../data/types";

const STORAGE_KEY = "shifa-shareef:reader-theme";

export const READER_THEME_COLORS: Record<ReaderTheme, { background: string; text: string; isDark: boolean }> = {
  light: { background: "#F4ECD9", text: "#173D31", isDark: false },
  sepia: { background: "#F5E6C8", text: "#3B2A14", isDark: false },
  dark:  { background: "#0B100D", text: "rgba(251, 247, 238, 0.95)", isDark: true },
};

export function useReaderTheme() {
  const [readerTheme, setReaderThemeState] = useState<ReaderTheme>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === "light" || val === "sepia" || val === "dark") {
          setReaderThemeState(val);
        }
      })
      .catch(() => {});
  }, []);

  const setReaderTheme = useCallback(async (theme: ReaderTheme) => {
    setReaderThemeState(theme);
    await AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
  }, []);

  return { readerTheme, setReaderTheme, themeColors: READER_THEME_COLORS[readerTheme] };
}
