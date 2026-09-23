import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ReadingProgress } from "../data/types";

const READING_PROGRESS_PREFIX = "shifa-shareef:reading-progress-";
const PREVIOUS_PROGRESS_PREFIX = "shifa-shareef:epub-progress-";

export function getReadingProgressStorageKey(languageId: string, volumeId: string): string {
  return `${READING_PROGRESS_PREFIX}${languageId}-${volumeId}`;
}

function parseStoredProgress(raw: string | null): ReadingProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReadingProgress> & { lastPage?: number };
    const progressPercent =
      typeof parsed.progressPercent === "number"
        ? parsed.progressPercent
        : typeof parsed.lastPage === "number" && parsed.lastPage > 0
          ? parsed.lastPage
          : 0;
    return {
      lastCfi: parsed.lastCfi,
      progressPercent: Math.min(1, Math.max(0, progressPercent)),
      lastReadAt: parsed.lastReadAt,
      currentSectionId: parsed.currentSectionId,
      currentSectionTitle: parsed.currentSectionTitle,
    };
  } catch {
    return null;
  }
}

export async function loadReadingProgress(languageId: string, volumeId: string): Promise<ReadingProgress> {
  const key = getReadingProgressStorageKey(languageId, volumeId);
  const previousKey = `${PREVIOUS_PROGRESS_PREFIX}${languageId}-${volumeId}`;
  const [stored, previousStored] = await Promise.all([
    AsyncStorage.getItem(key),
    AsyncStorage.getItem(previousKey),
  ]);
  const progress = parseStoredProgress(stored) ?? parseStoredProgress(previousStored);
  if (!progress) return { progressPercent: 0 };

  if (!stored && previousStored) {
    await AsyncStorage.setItem(key, JSON.stringify(progress));
    await AsyncStorage.removeItem(previousKey);
  }
  return progress;
}

export async function saveReadingProgress(
  languageId: string,
  volumeId: string,
  progress: ReadingProgress,
): Promise<void> {
  await AsyncStorage.setItem(
    getReadingProgressStorageKey(languageId, volumeId),
    JSON.stringify(progress),
  );
}

export async function resetVolumeReadingProgress(languageId: string, volumeId: string): Promise<void> {
  await AsyncStorage.multiRemove([
    getReadingProgressStorageKey(languageId, volumeId),
    `${PREVIOUS_PROGRESS_PREFIX}${languageId}-${volumeId}`,
  ]);
}
