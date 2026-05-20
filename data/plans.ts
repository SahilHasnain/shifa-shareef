import { TOTAL_PAGES } from "./book";

export type ReadingPlanItem = {
  day: number;
  label: string;
  startPage: number;
  endPage: number;
  estimatedMinutes: number;
};

export type ReadingPlan = {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  pagesPerDay: number;
  items: ReadingPlanItem[];
};

// Helper to generate plan items
function generatePlanItems(totalDays: number): ReadingPlanItem[] {
  const pagesPerDay = Math.ceil(TOTAL_PAGES / totalDays);
  const items: ReadingPlanItem[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const startPage = (day - 1) * pagesPerDay + 1;
    const endPage = Math.min(day * pagesPerDay, TOTAL_PAGES);
    const pageCount = endPage - startPage + 1;
    const estimatedMinutes = Math.ceil(pageCount * 0.5); // ~30 seconds per page

    items.push({
      day,
      label: `Day ${day}`,
      startPage,
      endPage,
      estimatedMinutes,
    });
  }

  return items;
}

export const READING_PLANS: ReadingPlan[] = [
  {
    id: "daily-light",
    title: "Daily Light",
    description:
      "Small, consistent portions perfect for building a steady habit. Read just 2-3 pages each day.",
    totalDays: 180,
    pagesPerDay: 3,
    items: generatePlanItems(180),
  },
  {
    id: "21-day",
    title: "21-Day Journey",
    description:
      "Balanced and realistic for most readers. Complete the book in three weeks with ~23 pages daily.",
    totalDays: 21,
    pagesPerDay: 23,
    items: generatePlanItems(21),
  },
  {
    id: "7-day",
    title: "7-Day Intensive",
    description:
      "For motivated readers seeking quick completion. Requires ~70 pages daily with strong commitment.",
    totalDays: 7,
    pagesPerDay: 70,
    items: generatePlanItems(7),
  },
];

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
