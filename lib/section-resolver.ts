import type { ReadingProgress, Section, Volume } from "../data/types";
import { getProgressPercent } from "./progress";

export type SectionStatus = "unread" | "current" | "completed";

export type ReaderNavigationTarget = {
  cfi?: string;
  progressPercent?: number;
};

function getSectionProgressRange(volume: Volume, section: Section) {
  return {
    start:
      section.startProgressPercent ??
      (section.startPage - 1) / volume.totalPages,
    end: section.endProgressPercent ?? section.endPage / volume.totalPages,
  };
}

export function getSectionStatus(
  volume: Volume,
  section: Section,
  progress: ReadingProgress,
): SectionStatus {
  const percent = getProgressPercent(progress);
  const { start, end } = getSectionProgressRange(volume, section);

  if (percent > end) return "completed";
  if (percent >= start && percent <= end) return "current";
  return "unread";
}

export function getCurrentSection(
  volume: Volume,
  progress: ReadingProgress,
): Section | undefined {
  return volume.sections.find(
    (section) => getSectionStatus(volume, section, progress) === "current",
  );
}

export function getSectionNavigationTarget(
  volume: Volume,
  section: Section,
): ReaderNavigationTarget {
  const { start } = getSectionProgressRange(volume, section);

  return {
    cfi: section.startCfi,
    progressPercent: start,
  };
}

export function getResumeNavigationTarget(
  volume: Volume,
  progress: ReadingProgress,
): ReaderNavigationTarget {
  if (progress.lastCfi) {
    return { cfi: progress.lastCfi };
  }

  const percent = getProgressPercent(progress);
  if (percent > 0) {
    return { progressPercent: percent };
  }

  return {};
}

export function buildReaderHref(
  languageId: string,
  volumeId: string,
  target: ReaderNavigationTarget,
): string {
  const params = new URLSearchParams();

  if (target.cfi) {
    params.set("cfi", target.cfi);
  } else if (target.progressPercent != null && target.progressPercent > 0) {
    params.set("progressPercent", String(target.progressPercent));
  }

  const query = params.toString();
  return `/reader/${languageId}/${volumeId}/1${query ? `?${query}` : ""}`;
}

export function getSectionPageLabel(_volume: Volume, section: Section): string {
  return `~Pages ${section.startPage}–${section.endPage}`;
}

export function getProgressDisplayLabel(
  _volume: Volume,
  progress: ReadingProgress,
): string {
  return `${Math.round(getProgressPercent(progress) * 100)}% complete`;
}
