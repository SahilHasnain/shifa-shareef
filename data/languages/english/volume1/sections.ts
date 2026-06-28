import type { Section } from "../../../types";

export const ENGLISH_VOLUME1_TOTAL_PAGES = 180;

const ENGLISH_VOLUME1_SECTION_DEFINITIONS = [
  {
    id: "front-matter",
    title: "Front Matter",
    startPage: 1,
    endPage: 15,
    estimatedMinutes: 30,
    description:
      "Title page, publisher's note, about the author, about the translator, and introduction.",
  },
  {
    id: "part-one-chapter-one",
    title: "Part One, Chapter 1: The Qur'an on the Prophet's Status",
    startPage: 16,
    endPage: 35,
    estimatedMinutes: 40,
    description:
      "Verses from the Qur'an regarding the Prophet's rank, praise, and Allah's special favour.",
  },
  {
    id: "part-one-chapter-two",
    title: "Part One, Chapter 2: Preference Over Prophets",
    startPage: 36,
    endPage: 55,
    estimatedMinutes: 40,
    description:
      "The Prophet's superiority over other prophets, blessings, help, and blessed mention in the Qur'an.",
  },
  {
    id: "part-one-chapter-three",
    title: "Part One, Chapter 3: Description, Cleanliness & Intellect",
    startPage: 56,
    endPage: 75,
    estimatedMinutes: 40,
    description:
      "Comprehensive description, cleanliness, intellect, eloquence, noble lineage, and upbringing.",
  },
  {
    id: "part-one-chapter-four",
    title: "Part One, Chapter 4: Character & Virtues",
    startPage: 76,
    endPage: 85,
    estimatedMinutes: 20,
    description:
      "Generosity, courage, modesty, good manners, compassion, justice, asceticism, and worship.",
  },
  {
    id: "part-two-chapter-one",
    title: "Part Two, Chapter 1: Hadith on the Prophet's Status",
    startPage: 86,
    endPage: 105,
    estimatedMinutes: 40,
    description:
      "Hadiths on the exaltation of his mention, the Night Journey, physical ascension, and vision of Allah.",
  },
  {
    id: "part-two-chapter-two",
    title: "Part Two, Chapter 2: Intercession & The Pool of Kawthar",
    startPage: 106,
    endPage: 115,
    estimatedMinutes: 20,
    description:
      "Intercession, the Praiseworthy Station, Paradise, the Pool of Kawthar, and his blessed names.",
  },
  {
    id: "part-two-chapter-three",
    title: "Part Two, Chapter 3: Prophethood, Revelation & Miracles",
    startPage: 116,
    endPage: 130,
    estimatedMinutes: 30,
    description:
      "Prophethood, messenger, revelation, definition of miracles, and the inimitability of the Qur'an.",
  },
  {
    id: "part-two-chapter-four",
    title: "Part Two, Chapter 4: Sensory Miracles",
    startPage: 131,
    endPage: 140,
    estimatedMinutes: 20,
    description:
      "Splitting of the moon, water flowing from fingers, increase of food, speaking trees, and answered prayers.",
  },
  {
    id: "part-three-chapter-one",
    title: "Part Three, Chapter 1: Obligation to Follow the Sunnah",
    startPage: 141,
    endPage: 155,
    estimatedMinutes: 30,
    description:
      "The rights of the Prophet over the ummah and the obligation to follow the Sunnah.",
  },
  {
    id: "part-three-chapter-two",
    title: "Part Three, Chapter 2: Love of the Prophet",
    startPage: 156,
    endPage: 160,
    estimatedMinutes: 10,
    description:
      "Love of the Prophet, its signs, reality, and the obligation of goodwill.",
  },
  {
    id: "part-four-chapter-one",
    title: "Part Four, Chapter 1: Reverence & Rights",
    startPage: 161,
    endPage: 165,
    estimatedMinutes: 10,
    description:
      "Reverence for the Prophet, his family, Companions, and the sanctity of sacred sites.",
  },
  {
    id: "part-four-chapter-two",
    title: "Part Four, Chapter 2: Blessings & Visitation",
    startPage: 166,
    endPage: 170,
    estimatedMinutes: 10,
    description:
      "Sending blessings, its obligation, occasions, manner, virtue, visitation of the blessed grave, and etiquette of the Prophet's Mosque.",
  },
  {
    id: "part-four-chapter-three",
    title: "Part Four, Chapter 3: Infallibility & Human States",
    startPage: 171,
    endPage: 175,
    estimatedMinutes: 10,
    description:
      "Infallibility of prophets, human experiences, refutation of objections, and worldly matters.",
  },
  {
    id: "back-matter",
    title: "Back Matter",
    startPage: 176,
    endPage: 180,
    estimatedMinutes: 10,
    description:
      "Glossary, index, and supplementary notes.",
  },
] as const satisfies ReadonlyArray<
  Pick<
    Section,
    | "id"
    | "title"
    | "startPage"
    | "endPage"
    | "estimatedMinutes"
    | "description"
  >
>;

export const ENGLISH_VOLUME1_SECTIONS: Section[] =
  ENGLISH_VOLUME1_SECTION_DEFINITIONS.map((section) => ({
    ...section,
    startProgressPercent:
      (section.startPage - 1) / ENGLISH_VOLUME1_TOTAL_PAGES,
    endProgressPercent: section.endPage / ENGLISH_VOLUME1_TOTAL_PAGES,
  }));
