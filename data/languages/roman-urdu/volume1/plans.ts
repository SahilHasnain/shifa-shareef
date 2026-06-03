import type { ReadingPlan, ReadingPlanItem } from "../../../types";

import {
  ROMAN_URDU_VOLUME1_SECTIONS,
  ROMAN_URDU_VOLUME1_TOTAL_PAGES,
} from "./sections";

function estimateMinutes(startPage: number, endPage: number) {
  return Math.max(8, (endPage - startPage + 1) * 2);
}

function getSectionTitleForPage(page: number) {
  return (
    ROMAN_URDU_VOLUME1_SECTIONS.find(
      (section) => page >= section.startPage && page <= section.endPage,
    )?.title ?? "Roman Urdu Reading"
  );
}

function createPagePlanItems(totalDays: number): ReadingPlanItem[] {
  const pagesPerDay = Math.ceil(ROMAN_URDU_VOLUME1_TOTAL_PAGES / totalDays);

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const startPage = index * pagesPerDay + 1;
    const endPage = Math.min(day * pagesPerDay, ROMAN_URDU_VOLUME1_TOTAL_PAGES);

    return {
      day,
      label: getSectionTitleForPage(startPage),
      startPage,
      endPage,
      estimatedMinutes: estimateMinutes(startPage, endPage),
    };
  });
}

const guidedSectionItems: ReadingPlanItem[] = ROMAN_URDU_VOLUME1_SECTIONS.map(
  (section, index) => ({
    day: index + 1,
    label: section.title,
    startPage: section.startPage,
    endPage: section.endPage,
    estimatedMinutes: section.estimatedMinutes,
  }),
);

export const ROMAN_URDU_VOLUME1_PLANS: ReadingPlan[] = [
  {
    id: "guided-sections",
    title: "Guided Section Journey",
    description:
      "Read the Roman Urdu edition by its real topics: muqaddima, fazail, mojizaat, huqooq, ismat, and ahkam.",
    totalDays: guidedSectionItems.length,
    pagesPerDay: Math.ceil(ROMAN_URDU_VOLUME1_TOTAL_PAGES / guidedSectionItems.length),
    items: guidedSectionItems,
  },
  {
    id: "30-day-steady",
    title: "30-Day Steady Reading",
    description:
      "A balanced month-long plan with daily portions labelled by the section you are reading.",
    totalDays: 30,
    pagesPerDay: Math.ceil(ROMAN_URDU_VOLUME1_TOTAL_PAGES / 30),
    items: createPagePlanItems(30),
  },
  {
    id: "7-week-relaxed",
    title: "7-Week Relaxed Reading",
    description:
      "Smaller daily portions for a calmer pace through the Roman Urdu edition.",
    totalDays: 49,
    pagesPerDay: Math.ceil(ROMAN_URDU_VOLUME1_TOTAL_PAGES / 49),
    items: createPagePlanItems(49),
  },
];
