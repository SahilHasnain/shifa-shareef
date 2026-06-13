import type { ReadingPlan, ReadingPlanItem, UnifiedProgress, Volume } from "../data/types";
import type { ReaderNavigationTarget } from "./section-resolver";

function getPlanItemProgressRange(volume: Volume, item: ReadingPlanItem) {
  return {
    start:
      item.startProgressPercent ??
      (item.startPage - 1) / volume.totalPages,
    end: item.endProgressPercent ?? item.endPage / volume.totalPages,
  };
}

export function getCurrentPlanDay(
  volume: Volume,
  plan: ReadingPlan,
  progress: UnifiedProgress,
): number {
  if (volume.format === "epub") {
    const percent = progress.progressPercent ?? 0;
    return (
      plan.items.find((item) => {
        const { start, end } = getPlanItemProgressRange(volume, item);
        return percent >= start && percent <= end;
      })?.day ?? 1
    );
  }

  const page = progress.lastPage ?? 1;
  return (
    plan.items.find(
      (item) => page >= item.startPage && page <= item.endPage,
    )?.day ?? 1
  );
}

export function getPlanDayProgress(
  volume: Volume,
  plan: ReadingPlan,
  progress: UnifiedProgress,
): number {
  const currentDay = getCurrentPlanDay(volume, plan, progress);
  return Math.round((currentDay / plan.totalDays) * 100);
}

export function getPlanItemForDay(
  plan: ReadingPlan,
  day: number,
): ReadingPlanItem | undefined {
  return plan.items.find((item) => item.day === day);
}

export function getPlanItemNavigationTarget(
  volume: Volume,
  item: ReadingPlanItem,
): ReaderNavigationTarget {
  if (volume.format === "epub") {
    const { start } = getPlanItemProgressRange(volume, item);
    return {
      format: "epub",
      progressPercent: start,
    };
  }

  return {
    format: "image",
    page: item.startPage,
  };
}

export function getPlanItemPageLabel(volume: Volume, item: ReadingPlanItem): string {
  if (volume.format === "epub") {
    return `~Pages ${item.startPage}–${item.endPage}`;
  }

  return `Pages ${item.startPage}–${item.endPage}`;
}

export function isPlanDayComplete(
  volume: Volume,
  item: ReadingPlanItem,
  progress: UnifiedProgress,
): boolean {
  if (volume.format === "epub") {
    const percent = progress.progressPercent ?? 0;
    const { end } = getPlanItemProgressRange(volume, item);
    return percent >= end;
  }

  const page = progress.lastPage ?? 1;
  return page >= item.endPage;
}
