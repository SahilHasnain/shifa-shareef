import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ReadingProgress } from "../data/types";

const LEGACY_READING_PROGRESS_PREFIX = "shifa-shareef:reading-progress-";
const LEGACY_FORMAT_PREFERENCE_KEY = "shifa-shareef:reading-format-preference";

export function getReadingProgressStorageKey(
  languageId: string,
  volumeId: string,
): string {
  return `shifa-shareef:epub-progress-${languageId}-${volumeId}`;
}

function parseStoredProgress(raw: string): ReadingProgress | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ReadingProgress> & {
      lastPage?: number;
      lastFormat?: string;
    };

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

export async function loadReadingProgress(
  languageId: string,
  volumeId: string,
): Promise<ReadingProgress> {
  const storageKey = getReadingProgressStorageKey(languageId, volumeId);
  const [epubStored, legacyStored] = await Promise.all([
    AsyncStorage.getItem(storageKey),
    AsyncStorage.getItem(
      `${LEGACY_READING_PROGRESS_PREFIX}${languageId}-${volumeId}`,
    ),
  ]);

  const epubProgress = epubStored ? parseStoredProgress(epubStored) : null;
  const legacyProgress = legacyStored ? parseStoredProgress(legacyStored) : null;

  if (!epubProgress && !legacyProgress) {
    return { progressPercent: 0 };
  }

  if (!epubProgress) {
    return legacyProgress ?? { progressPercent: 0 };
  }

  if (!legacyProgress) {
    return epubProgress;
  }

  const mergedPercent = Math.max(
    epubProgress.progressPercent,
    legacyProgress.progressPercent,
  );
  const useEpubTimestamp =
    !legacyProgress.lastReadAt ||
    (epubProgress.lastReadAt != null &&
      epubProgress.lastReadAt >= legacyProgress.lastReadAt);

  return {
    lastCfi: epubProgress.lastCfi || legacyProgress.lastCfi,
    progressPercent: mergedPercent,
    lastReadAt: useEpubTimestamp
      ? epubProgress.lastReadAt ?? legacyProgress.lastReadAt
      : legacyProgress.lastReadAt ?? epubProgress.lastReadAt,
    currentSectionId:
      epubProgress.currentSectionId ?? legacyProgress.currentSectionId,
    currentSectionTitle:
      epubProgress.currentSectionTitle ?? legacyProgress.currentSectionTitle,
  };
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

export async function resetVolumeReadingProgress(
  languageId: string,
  volumeId: string,
): Promise<void> {
  await AsyncStorage.multiRemove([
    getReadingProgressStorageKey(languageId, volumeId),
    `${LEGACY_READING_PROGRESS_PREFIX}${languageId}-${volumeId}`,
  ]);
}

export async function clearLegacyReadingStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const legacyKeys = keys.filter(
    (key) =>
      key.startsWith(LEGACY_READING_PROGRESS_PREFIX) ||
      key === LEGACY_FORMAT_PREFERENCE_KEY,
  );

  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys);
  }
}
