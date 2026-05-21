import type { Section } from "../../types";

export const VOLUME1_TOTAL_PAGES = 489;

export const VOLUME1_SECTIONS: Section[] = [
  {
    id: "opening",
    title: "Opening Chapters",
    startPage: 1,
    endPage: 97,
    estimatedMinutes: 25,
    description:
      "A natural starting section for first-time readers, keeping the opening portion manageable.",
  },
  {
    id: "early-middle",
    title: "Early Reflections",
    startPage: 98,
    endPage: 195,
    estimatedMinutes: 28,
    description:
      "Deepening understanding through early reflections and foundational teachings.",
  },
  {
    id: "middle",
    title: "Core Teachings",
    startPage: 196,
    endPage: 293,
    estimatedMinutes: 30,
    description:
      "The heart of the book with essential teachings and spiritual guidance.",
  },
  {
    id: "late-middle",
    title: "Advanced Insights",
    startPage: 294,
    endPage: 391,
    estimatedMinutes: 28,
    description:
      "Advanced spiritual insights and deeper contemplations for continued growth.",
  },
  {
    id: "closing",
    title: "Closing Sections",
    startPage: 392,
    endPage: 489,
    estimatedMinutes: 26,
    description:
      "The final part of the book, bringing together all teachings with concluding wisdom.",
  },
];
