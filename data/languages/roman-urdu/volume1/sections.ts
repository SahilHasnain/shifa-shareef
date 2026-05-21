import type { Section } from "../../../types";

export const ROMAN_URDU_VOLUME1_TOTAL_PAGES = 306;

export const ROMAN_URDU_VOLUME1_SECTIONS: Section[] = [
  {
    id: "opening",
    title: "Opening Chapters",
    startPage: 1,
    endPage: 61,
    estimatedMinutes: 20,
    description:
      "A manageable opening stretch for settling into the Roman Urdu edition with steady momentum.",
  },
  {
    id: "early-reflections",
    title: "Early Reflections",
    startPage: 62,
    endPage: 122,
    estimatedMinutes: 22,
    description:
      "A calm section for continuing through the early material without overwhelming the reader.",
  },
  {
    id: "core-teachings",
    title: "Core Teachings",
    startPage: 123,
    endPage: 183,
    estimatedMinutes: 24,
    description:
      "The central teaching section, suitable for regular daily reading and understanding.",
  },
  {
    id: "advanced-insights",
    title: "Advanced Insights",
    startPage: 184,
    endPage: 244,
    estimatedMinutes: 22,
    description:
      "A deeper stretch of reading that benefits from patient and consistent progress.",
  },
  {
    id: "closing",
    title: "Closing Sections",
    startPage: 245,
    endPage: 306,
    estimatedMinutes: 21,
    description:
      "The concluding portion of the Roman Urdu edition, leading the reader toward completion.",
  },
];
