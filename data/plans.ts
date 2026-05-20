import { DEFAULT_VOLUME_ID, getVolumeById } from "./volumes";
import type { ReadingPlan, ReadingPlanItem } from "./types";

export type { ReadingPlan, ReadingPlanItem } from "./types";

export const READING_PLANS: ReadingPlan[] = getVolumeById(DEFAULT_VOLUME_ID).plans;

export function getPlanById(id: string): ReadingPlan | undefined {
  return READING_PLANS.find((plan) => plan.id === id);
}

export function getCurrentDayForPlan(
  plan: ReadingPlan,
  currentPage: number,
): number {
  // Find which day the current page falls into
  const dayItem = plan.items.find(
    (item) => currentPage >= item.startPage && currentPage <= item.endPage,
  );
  return dayItem?.day ?? 1;
}

export function getPlanProgress(plan: ReadingPlan, currentPage: number): number {
  const currentDay = getCurrentDayForPlan(plan, currentPage);
  return Math.round((currentDay / plan.totalDays) * 100);
}
