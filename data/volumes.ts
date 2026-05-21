import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_VOLUME_ID,
  getCurrentSectionByLanguage,
  getPageImageForLanguageVolume,
  getVolumesForLanguage,
} from "./languages";

export { DEFAULT_VOLUME_ID } from "./languages";

export const VOLUMES = getVolumesForLanguage(DEFAULT_LANGUAGE_ID);

export function getVolumeById(id?: string | null) {
  return getVolumesForLanguage(DEFAULT_LANGUAGE_ID).find((volume) => volume.id === id) ?? VOLUMES[0];
}

export function getCurrentSection(volumeId: string, page: number) {
  return getCurrentSectionByLanguage(DEFAULT_LANGUAGE_ID, volumeId, page);
}

export function getPageImageForVolume(volumeId: string, page: number) {
  return getPageImageForLanguageVolume(DEFAULT_LANGUAGE_ID, volumeId, page);
}
