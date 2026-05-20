import type { ReadingPlan, ReadingPlanItem } from "../types";

export function generatePlanItems(
  totalPages: number,
  totalDays: number,
): ReadingPlanItem[] {
  const pagesPerDay = Math.ceil(totalPages / totalDays);
  const items: ReadingPlanItem[] = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const startPage = (day - 1) * pagesPerDay + 1;
    const endPage = Math.min(day * pagesPerDay, totalPages);
    const pageCount = endPage - startPage + 1;

    items.push({
      day,
      label: `Day ${day}`,
      startPage,
      endPage,
      estimatedMinutes: Math.ceil(pageCount * 0.5),
    });
  }

  return items;
}

export function createDefaultReadingPlans(totalPages: number): ReadingPlan[] {
  return [
    {
      id: "daily-light",
      title: "Daily Light",
      description:
        "Small, consistent portions perfect for building a steady habit. Read just a few pages each day.",
      totalDays: 180,
      pagesPerDay: Math.ceil(totalPages / 180),
      items: generatePlanItems(totalPages, 180),
    },
    {
      id: "21-day",
      title: "21-Day Journey",
      description:
        "Balanced and realistic for most readers. Complete the volume in three weeks with steady daily reading.",
      totalDays: 21,
      pagesPerDay: Math.ceil(totalPages / 21),
      items: generatePlanItems(totalPages, 21),
    },
    {
      id: "7-day",
      title: "7-Day Intensive",
      description:
        "For motivated readers seeking quick completion with a stronger daily commitment.",
      totalDays: 7,
      pagesPerDay: Math.ceil(totalPages / 7),
      items: generatePlanItems(totalPages, 7),
    },
  ];
}
