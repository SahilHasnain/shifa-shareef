import type { TocEntry, VolumePageMeta } from "./types";
import { PAGE_META as romanUrduVolume1PageMeta } from "./languages/roman-urdu/volume1/page-meta";
import { VOLUME_TOC as romanUrduVolume1Toc } from "./languages/roman-urdu/volume1/toc";
import { PAGE_META as urduVolume1PageMeta } from "./languages/urdu/volume1/page-meta";
import { VOLUME_TOC as urduVolume1Toc } from "./languages/urdu/volume1/toc";
import { PAGE_META as urduVolume2PageMeta } from "./languages/urdu/volume2/page-meta";
import { VOLUME_TOC as urduVolume2Toc } from "./languages/urdu/volume2/toc";

const PAGE_META_BY_SCOPE = new Map<string, VolumePageMeta>([
  ["urdu:volume1", urduVolume1PageMeta],
  ["urdu:volume2", urduVolume2PageMeta],
  ["roman-urdu:volume1", romanUrduVolume1PageMeta],
]);

const TOC_BY_SCOPE = new Map<string, TocEntry[]>([
  ["urdu:volume1", urduVolume1Toc],
  ["urdu:volume2", urduVolume2Toc],
  ["roman-urdu:volume1", romanUrduVolume1Toc],
]);

function getScopeKey(languageId: string, volumeId: string) {
  return `${languageId}:${volumeId}`;
}

export function getVolumePageMeta(
  languageId: string,
  volumeId: string,
): VolumePageMeta | null {
  return PAGE_META_BY_SCOPE.get(getScopeKey(languageId, volumeId)) ?? null;
}

export function getVolumeToc(languageId: string, volumeId: string): TocEntry[] {
  return TOC_BY_SCOPE.get(getScopeKey(languageId, volumeId)) ?? [];
}
