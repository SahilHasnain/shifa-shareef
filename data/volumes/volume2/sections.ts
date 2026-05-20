import type { Section } from "../../types";

export const VOLUME2_TOTAL_PAGES = 485;

export const VOLUME2_SECTIONS: Section[] = [
  {
    id: "opening",
    title: "Opening Chapters",
    startPage: 1,
    endPage: 97,
    estimatedMinutes: 25,
    description:
      "The opening section of Volume 2, suitable for settling into the second part of the text.",
  },
  {
    id: "early-middle",
    title: "Early Reflections",
    startPage: 98,
    endPage: 194,
    estimatedMinutes: 28,
    description:
      "A measured section for steady continuation through the early middle chapters.",
  },
  {
    id: "middle",
    title: "Core Teachings",
    startPage: 195,
    endPage: 291,
    estimatedMinutes: 30,
    description:
      "The central portion of Volume 2, intended for structured progress and regular reading.",
  },
  {
    id: "late-middle",
    title: "Advanced Insights",
    startPage: 292,
    endPage: 388,
    estimatedMinutes: 28,
    description:
      "A deeper stretch of reading that should later tie into focused reading plans.",
  },
  {
    id: "closing",
    title: "Closing Sections",
    startPage: 389,
    endPage: 485,
    estimatedMinutes: 26,
    description:
      "The closing portion of Volume 2, designed for calm completion and clear progress tracking.",
  },
];
