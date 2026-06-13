import type { Section, UnifiedProgress, Volume } from "../data/types";

export type SectionStatus = "unread" | "current" | "completed";

export type ReaderNavigationTarget =
  | { format: "image"; page: number }
  | { format: "epub"; cfi?: string; progressPercent?: number };

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
  progress: UnifiedProgress,
): SectionStatus {
  if (volume.format === "epub") {
    const percent = progress.progressPercent ?? 0;
    const { start, end } = getSectionProgressRange(volume, section);

    if (percent > end) return "completed";
    if (percent >= start && percent <= end) return "current";
    return "unread";
  }

  const lastPage = progress.lastPage ?? 1;
  if (lastPage > section.endPage) return "completed";
  if (lastPage >= section.startPage && lastPage <= section.endPage) return "current";
  return "unread";
}

export function getCurrentSection(
  volume: Volume,
  progress: UnifiedProgress,
): Section | undefined {
  return volume.sections.find(
    (section) => getSectionStatus(volume, section, progress) === "current",
  );
}

export function getSectionNavigationTarget(
  volume: Volume,
  section: Section,
): ReaderNavigationTarget {
  if (volume.format === "epub") {
    const { start } = getSectionProgressRange(volume, section);
    return {
      format: "epub",
      cfi: section.startCfi,
      progressPercent: start,
    };
  }

  return {
    format: "image",
    page: section.startPage,
  };
}

export function getResumeNavigationTarget(
  volume: Volume,
  progress: UnifiedProgress,
): ReaderNavigationTarget {
  if (volume.format === "epub") {
    if (progress.lastCfi) {
      return { format: "epub", cfi: progress.lastCfi };
    }

    return { format: "epub" };
  }

  return {
    format: "image",
    page: progress.lastPage ?? 1,
  };
}

export function buildReaderHref(
  languageId: string,
  volumeId: string,
  target: ReaderNavigationTarget,
): string {
  if (target.format === "epub") {
    const params = new URLSearchParams();

    if (target.cfi) {
      params.set("cfi", target.cfi);
    } else if (target.progressPercent != null && target.progressPercent > 0) {
      params.set("progressPercent", String(target.progressPercent));
    }

    const query = params.toString();
    return `/reader/${languageId}/${volumeId}/1${query ? `?${query}` : ""}`;
  }

  return `/reader/${languageId}/${volumeId}/${target.page}`;
}

export function getSectionPageLabel(volume: Volume, section: Section): string {
  if (volume.format === "epub") {
    return `~Pages ${section.startPage}–${section.endPage}`;
  }

  return `Pages ${section.startPage}–${section.endPage}`;
}

export function getProgressDisplayLabel(
  volume: Volume,
  progress: UnifiedProgress,
): string {
  if (volume.format === "epub") {
    const percent = Math.round((progress.progressPercent ?? 0) * 100);
    return `${percent}% complete`;
  }

  const page = progress.lastPage ?? 1;
  return `Page ${page}/${volume.totalPages}`;
}
