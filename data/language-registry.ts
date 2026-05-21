import { VOLUME1_PLANS } from "./languages/urdu/volume1/plans";
import { getPageImage as getUrduVolume1PageImage } from "./languages/urdu/volume1/pages";
import {
  VOLUME1_SECTIONS,
  VOLUME1_TOTAL_PAGES,
} from "./languages/urdu/volume1/sections";
import { VOLUME2_PLANS } from "./languages/urdu/volume2/plans";
import { getPageImage as getUrduVolume2PageImage } from "./languages/urdu/volume2/pages";
import {
  VOLUME2_SECTIONS,
  VOLUME2_TOTAL_PAGES,
} from "./languages/urdu/volume2/sections";
import { ROMAN_URDU_VOLUME1_PLANS } from "./languages/roman-urdu/volume1/plans";
import { getPageImage as getRomanUrduVolume1PageImage } from "./languages/roman-urdu/volume1/pages";
import {
  ROMAN_URDU_VOLUME1_SECTIONS,
  ROMAN_URDU_VOLUME1_TOTAL_PAGES,
} from "./languages/roman-urdu/volume1/sections";
import type { Language, Section, Volume } from "./types";

export const DEFAULT_LANGUAGE_ID = "urdu";
export const DEFAULT_LANGUAGE_TITLE = "Urdu";
export const ROMAN_URDU_LANGUAGE_ID = "roman-urdu";
export const DEFAULT_VOLUME_ID = "volume1";

const URDU_VOLUMES: Volume[] = [
  {
    id: "volume1",
    title: "Volume 1",
    totalPages: VOLUME1_TOTAL_PAGES,
    sections: VOLUME1_SECTIONS,
    plans: VOLUME1_PLANS,
  },
  {
    id: "volume2",
    title: "Volume 2",
    totalPages: VOLUME2_TOTAL_PAGES,
    sections: VOLUME2_SECTIONS,
    plans: VOLUME2_PLANS,
  },
];

const ROMAN_URDU_VOLUMES: Volume[] = [
  {
    id: "volume1",
    title: "Volume 1",
    subtitle: "Roman Urdu Edition",
    totalPages: ROMAN_URDU_VOLUME1_TOTAL_PAGES,
    sections: ROMAN_URDU_VOLUME1_SECTIONS,
    plans: ROMAN_URDU_VOLUME1_PLANS,
  },
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

export function getPageImageForLanguageVolume(
  languageId: string,
  volumeId: string,
  page: number,
) {
  if (languageId === ROMAN_URDU_LANGUAGE_ID) {
    return getRomanUrduVolume1PageImage(page);
  }

  if (volumeId === "volume2") {
    return getUrduVolume2PageImage(page);
  }

  return getUrduVolume1PageImage(page);
}

export function getVolumeDisplayTitle(
  languageId: string,
  volumeId: string,
  fallbackTitle?: string,
) {
  const language = getLanguageById(languageId);
  const volume = getVolumeByLanguageAndId(languageId, volumeId);

  if (language.volumes.length === 1) {
    return volume.subtitle ?? fallbackTitle ?? language.title;
  }

  return volume.title;
}

export function shouldShowVolumeLabel(languageId: string) {
  return getLanguageById(languageId).volumes.length > 1;
}
