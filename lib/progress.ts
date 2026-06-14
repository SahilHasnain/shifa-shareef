import type { ReadingProgress, Volume } from "../data/types";

export function formatProgressRange(start: number, end: number): string {
  return `${Math.round(start * 100)}–${Math.round(end * 100)}%`;
}

export function getProgressPercent(
  progress: ReadingProgress | undefined | null,
): number {
  if (!progress) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress.progressPercent ?? 0));
}

export function getVolumeCompletionPercent(
  volume: Volume,
  progress: ReadingProgress | undefined,
): number {
  return Math.round(getProgressPercent(progress) * 100);
}

export function getLanguageCompletionPercent(
  volumes: Volume[],
  progressByVolume: Record<string, ReadingProgress | undefined>,
): number {
  const totalPages = volumes.reduce((sum, volume) => sum + volume.totalPages, 0);
  if (totalPages === 0) {
    return 0;
  }

  const readEquivalent = volumes.reduce((sum, volume) => {
    const progress = progressByVolume[volume.id];
    return sum + getProgressPercent(progress) * volume.totalPages;
  }, 0);

  return Math.min(100, Math.round((readEquivalent / totalPages) * 100));
}
