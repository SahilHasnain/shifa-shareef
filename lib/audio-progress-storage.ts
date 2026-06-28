import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "shifa-shareef:audio-progress";

export type AudioProgress = {
  positionMillis: number;
  durationMillis: number;
  progressPercent: number;
  updatedAt: string;
};

export async function loadAllAudioProgress(): Promise<
  Record<string, AudioProgress>
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, AudioProgress>;
  } catch {
    return {};
  }
}

export async function saveAudioProgress(
  trackId: string,
  progress: AudioProgress,
): Promise<void> {
  try {
    const all = await loadAllAudioProgress();
    all[trackId] = progress;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // silently fail
  }
}

export async function resetAudioProgress(
  trackId: string,
): Promise<void> {
  try {
    const all = await loadAllAudioProgress();
    delete all[trackId];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // silently fail
  }
}
