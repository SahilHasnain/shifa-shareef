import { VOLUME1_PLANS, VOLUME1_TOTAL_PAGES } from "./volumes/volume1/plans";
import { getPageImage as getVolume1PageImage } from "./volumes/volume1/pages";
import { VOLUME1_SECTIONS } from "./volumes/volume1/sections";
import { VOLUME2_PLANS } from "./volumes/volume2/plans";
import { getPageImage as getVolume2PageImage } from "./volumes/volume2/pages";
import { VOLUME2_SECTIONS, VOLUME2_TOTAL_PAGES } from "./volumes/volume2/sections";
import type { Section, Volume } from "./types";

export const DEFAULT_VOLUME_ID = "volume1";

export const VOLUMES: Volume[] = [
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

export function getVolumeById(id?: string | null) {
  return VOLUMES.find((volume) => volume.id === id) ?? VOLUMES[0];
}

export function getCurrentSection(volumeId: string, page: number): Section | undefined {
  const volume = getVolumeById(volumeId);
  return volume.sections.find(
    (section) => page >= section.startPage && page <= section.endPage,
  );
}

export function getPageImageForVolume(volumeId: string, page: number) {
  if (volumeId === "volume2") {
    return getVolume2PageImage(page);
  }

  return getVolume1PageImage(page);
}
