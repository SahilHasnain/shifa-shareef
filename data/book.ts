export const BOOK_TITLE = "Shifa Shareef";

export const TOTAL_PAGES = 310;

export const SHIFA_PDF_ASSET = require("../assets/pdf/Shifa Shareef Urdu - V1.pdf");

export const SECTIONS = [
  {
    id: "opening",
    title: "Opening Chapters",
    startPage: 1,
    endPage: 52,
    estimatedMinutes: 18,
    description:
      "A natural starting section for first-time readers, keeping the opening portion manageable.",
  },
  {
    id: "middle",
    title: "Middle Reflection",
    startPage: 53,
    endPage: 164,
    estimatedMinutes: 22,
    description:
      "A longer stretch that should later be split into smaller reading sessions and plans.",
  },
  {
    id: "closing",
    title: "Closing Sections",
    startPage: 165,
    endPage: 310,
    estimatedMinutes: 24,
    description:
      "The final part of the book, suitable for resume-based reading and completion tracking.",
  },
] as const;
