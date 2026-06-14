import { VOLUME1_PLANS } from "./languages/urdu/volume1/plans";
import {
  VOLUME1_SECTIONS,
  VOLUME1_TOTAL_PAGES,
} from "./languages/urdu/volume1/sections";
import { VOLUME2_PLANS } from "./languages/urdu/volume2/plans";
import {
  VOLUME2_SECTIONS,
  VOLUME2_TOTAL_PAGES,
} from "./languages/urdu/volume2/sections";
import { ROMAN_URDU_VOLUME1_PLANS } from "./languages/roman-urdu/volume1/plans";
import {
  ROMAN_URDU_VOLUME1_SECTIONS,
  ROMAN_URDU_VOLUME1_TOTAL_PAGES,
} from "./languages/roman-urdu/volume1/sections";
import type { Language, ReadingPlan, Section, Volume } from "./types";

export const DEFAULT_LANGUAGE_ID = "urdu";
export const DEFAULT_LANGUAGE_TITLE = "Urdu";
export const ROMAN_URDU_LANGUAGE_ID = "roman-urdu";
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

function withPlanProgress(plans: ReadingPlan[], totalPages: number): ReadingPlan[] {
  return plans.map((plan) => ({
    ...plan,
    items: plan.items.map((item) => ({
      ...item,
      startProgressPercent:
        item.startProgressPercent ?? (item.startPage - 1) / totalPages,
      endProgressPercent:
        item.endProgressPercent ?? item.endPage / totalPages,
    })),
  }));
}

function buildVolume(
  id: string,
  title: string,
  totalPages: number,
  sections: Section[],
  plans: ReadingPlan[],
): Volume {
  return {
    id,
    title,
    totalPages,
    sections: withSectionProgress(sections, totalPages),
    plans: withPlanProgress(plans, totalPages),
  };
}

const URDU_VOLUMES: Volume[] = [
  buildVolume(
    "volume1",
    "Volume 1",
    VOLUME1_TOTAL_PAGES,
    VOLUME1_SECTIONS,
    VOLUME1_PLANS,
  ),
  buildVolume(
    "volume2",
    "Volume 2",
    VOLUME2_TOTAL_PAGES,
    VOLUME2_SECTIONS,
    VOLUME2_PLANS,
  ),
];

const ROMAN_URDU_VOLUMES: Volume[] = [
  buildVolume(
    "volume1",
    "Roman Urdu",
    ROMAN_URDU_VOLUME1_TOTAL_PAGES,
    ROMAN_URDU_VOLUME1_SECTIONS,
    ROMAN_URDU_VOLUME1_PLANS,
  ),
];

export const LANGUAGES: Language[] = [
  {
    id: DEFAULT_LANGUAGE_ID,
    title: DEFAULT_LANGUAGE_TITLE,
    nativeTitle: "Urdu",
    volumes: URDU_VOLUMES,
  },
  {
    id: ROMAN_URDU_LANGUAGE_ID,
    title: "Roman Urdu",
    nativeTitle: "Roman Urdu",
    volumes: ROMAN_URDU_VOLUMES,
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
