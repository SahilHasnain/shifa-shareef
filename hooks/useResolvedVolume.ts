import { useMemo } from "react";

import { getVolumeByLanguageAndId } from "../data/languages";
import type { Volume } from "../data/types";
import { getResolvedVolume } from "../lib/reading-format-resolver";
import { useReadingFormatPreference } from "./useReadingFormatPreference";

export function useResolvedVolume(languageId: string, volumeId: string): Volume {
  const baseVolume = getVolumeByLanguageAndId(languageId, volumeId);
  const { preference } = useReadingFormatPreference();

  return useMemo(
    () => getResolvedVolume(baseVolume, preference),
    [baseVolume, preference],
  );
}
