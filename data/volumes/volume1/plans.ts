import type { ReadingPlan, ReadingPlanItem } from "../../types";

import { VOLUME1_SECTIONS, VOLUME1_TOTAL_PAGES } from "./sections";

function estimateMinutes(startPage: number, endPage: number) {
  return Math.max(8, (endPage - startPage + 1) * 2);
}

function getSectionTitleForPage(page: number) {
  return (
    VOLUME1_SECTIONS.find(
      (section) => page >= section.startPage && page <= section.endPage,
    )?.title ?? "مطالعہ جلد اول"
  );
}

function createPagePlanItems(totalDays: number): ReadingPlanItem[] {
  const pagesPerDay = Math.ceil(VOLUME1_TOTAL_PAGES / totalDays);

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const startPage = index * pagesPerDay + 1;
    const endPage = Math.min(day * pagesPerDay, VOLUME1_TOTAL_PAGES);

    return {
      day,
      label: getSectionTitleForPage(startPage),
      startPage,
      endPage,
      estimatedMinutes: estimateMinutes(startPage, endPage),
    };
  });
}

const guidedSectionItems: ReadingPlanItem[] = VOLUME1_SECTIONS.map((section, index) => ({
  day: index + 1,
  label: section.title,
  startPage: section.startPage,
  endPage: section.endPage,
  estimatedMinutes: section.estimatedMinutes,
}));

export const VOLUME1_PLANS: ReadingPlan[] = [
  {
    id: "guided-sections",
    title: "رہنما مطالعہ بر اساس ابواب",
    description:
      "جلد اول کو اصل موضوعات کے مطابق پڑھیں: مقدمہ، شان و عظمت، اخلاق، معراج، شفاعت اور معجزات۔",
    totalDays: guidedSectionItems.length,
    pagesPerDay: Math.ceil(VOLUME1_TOTAL_PAGES / guidedSectionItems.length),
    items: guidedSectionItems,
  },
  {
    id: "30-day-steady",
    title: "30 روزہ متوازن مطالعہ",
    description:
      "روزانہ مناسب مقدار کے ساتھ ایک ماہ میں جلد اول مکمل کریں، ہر دن کا عنوان موجودہ موضوع سے لیا گیا ہے۔",
    totalDays: 30,
    pagesPerDay: Math.ceil(VOLUME1_TOTAL_PAGES / 30),
    items: createPagePlanItems(30),
  },
  {
    id: "7-week-relaxed",
    title: "7 ہفتوں کا آسان مطالعہ",
    description:
      "چھوٹے روزانہ حصوں کے ساتھ جلد اول کو آرام سے اور تسلسل کے ساتھ پڑھنے کا منصوبہ۔",
    totalDays: 49,
    pagesPerDay: Math.ceil(VOLUME1_TOTAL_PAGES / 49),
    items: createPagePlanItems(49),
  },
];
