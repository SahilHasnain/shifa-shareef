import type { ReadingProgress } from "../data/types";
import { useReadingProgress } from "./useReadingProgress";

export function useVolumeProgress(
  volumeId: string,
  languageId: string,
): {
  progress: ReadingProgress;
  isLoaded: boolean;
} {
  return useReadingProgress(volumeId, languageId);
}
