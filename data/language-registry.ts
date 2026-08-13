import {
  VOLUME1_SECTIONS,
  VOLUME1_TOTAL_PAGES,
} from "./languages/urdu/volume1/sections";
import {
  VOLUME2_SECTIONS,
  VOLUME2_TOTAL_PAGES,
} from "./languages/urdu/volume2/sections";
import {
  ROMAN_URDU_VOLUME1_SECTIONS,
  ROMAN_URDU_VOLUME1_TOTAL_PAGES,
} from "./languages/roman-urdu/volume1/sections";
import {
  ENGLISH_VOLUME1_SECTIONS,
  ENGLISH_VOLUME1_TOTAL_PAGES,
} from "./languages/english/volume1/sections";
import type { Language, Section, Volume } from "./types";

export const DEFAULT_LANGUAGE_ID = "english";
export const DEFAULT_LANGUAGE_TITLE = "English";
export const ROMAN_URDU_LANGUAGE_ID = "roman-urdu";
export const ENGLISH_LANGUAGE_ID = "english";
export const DEFAULT_VOLUME_ID = "volume1";

function withSectionProgress(sections: Section[], totalPages: number): Section[] {
  return sections.map((section) => ({
    ...section,
    startProgressPercent:
      section.startProgressPercent ?? (section.startPage - 1) / totalPages,
    endProgressPercent:
      section.endProgressPercent ?? section.endPage / totalPages,
  }));
}

function buildVolume(
  id: string,
  title: string,
  totalPages: number,
  sections: Section[],
): Volume {
  return {
    id,
    title,
    totalPages,
    sections: withSectionProgress(sections, totalPages),
  };
}

const URDU_VOLUMES: Volume[] = [
  buildVolume("volume1", "Volume 1", VOLUME1_TOTAL_PAGES, VOLUME1_SECTIONS),
  buildVolume("volume2", "Volume 2", VOLUME2_TOTAL_PAGES, VOLUME2_SECTIONS),
];

const ROMAN_URDU_VOLUMES: Volume[] = [
  buildVolume(
    "volume1",
    "Roman Urdu",
    ROMAN_URDU_VOLUME1_TOTAL_PAGES,
    ROMAN_URDU_VOLUME1_SECTIONS,
  ),
];

const ENGLISH_VOLUMES: Volume[] = [
  buildVolume(
    "volume1",
    "English",
    ENGLISH_VOLUME1_TOTAL_PAGES,
    ENGLISH_VOLUME1_SECTIONS,
  ),
];

export const LANGUAGES: Language[] = [
  {
    id: ENGLISH_LANGUAGE_ID,
    title: "English",
    nativeTitle: "English",
    volumes: ENGLISH_VOLUMES,
  },
  {
    id: ROMAN_URDU_LANGUAGE_ID,
    title: "Roman Urdu",
    nativeTitle: "Roman Urdu",
    volumes: ROMAN_URDU_VOLUMES,
  },
  {
    id: "urdu",
    title: "Urdu",
    nativeTitle: "Urdu",
    volumes: URDU_VOLUMES,
  },
];

export function getLanguageById(id?: string | null) {
  return LANGUAGES.find((language) => language.id === id) ?? LANGUAGES[0];
}

export function getVolumesForLanguage(languageId?: string | null): Volume[] {
  return getLanguageById(languageId).volumes;
}

export function getVolumeByLanguageAndId(
  languageId: string | null | undefined,
  volumeId?: string | null,
) {
  const volumes = getVolumesForLanguage(languageId);
  return volumes.find((volume) => volume.id === volumeId) ?? volumes[0];
}

export function getCurrentSectionByLanguage(
  languageId: string,
  volumeId: string,
  page: number,
): Section | undefined {
  const volume = getVolumeByLanguageAndId(languageId, volumeId);
  return volume.sections.find(
    (section) => page >= section.startPage && page <= section.endPage,
  );
}

export function getVolumeDisplayTitle(
  languageId: string,
  volumeId: string,
  fallbackTitle?: string,
) {
  const language = getLanguageById(languageId);
  const volume = getVolumeByLanguageAndId(languageId, volumeId);

  if (language.volumes.length === 1) {
    return volume.title;
  }

  return volume.title;
}

export function shouldShowVolumeLabel(languageId: string) {
  return getLanguageById(languageId).volumes.length > 1;
}
