import type { ReadingPlan, ReadingPlanItem, ReadingProgress, Volume } from "../data/types";
import { getProgressPercent } from "./progress";
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
  progress: ReadingProgress,
): number {
  const percent = getProgressPercent(progress);

  return (
    plan.items.find((item) => {
      const { start, end } = getPlanItemProgressRange(volume, item);
      return percent >= start && percent <= end;
    })?.day ?? 1
  );
}

export function getPlanDayProgress(
  volume: Volume,
  plan: ReadingPlan,
  progress: ReadingProgress,
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
  const { start } = getPlanItemProgressRange(volume, item);

  return {
    progressPercent: start,
  };
}

export function getPlanItemPageLabel(_volume: Volume, item: ReadingPlanItem): string {
  return `~Pages ${item.startPage}–${item.endPage}`;
}

export function isPlanDayComplete(
  volume: Volume,
  item: ReadingPlanItem,
  progress: ReadingProgress,
): boolean {
  const percent = getProgressPercent(progress);
  const { end } = getPlanItemProgressRange(volume, item);
  return percent >= end;
}
