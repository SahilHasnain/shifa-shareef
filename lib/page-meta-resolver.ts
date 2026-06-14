import { getVolumePageMeta } from "../data/page-meta-registry";
import type { VolumePageMeta } from "../data/types";

export function getPageLabel(
  meta: VolumePageMeta | null,
  pdfPage: number,
): string {
  if (!meta) {
    return String(pdfPage);
  }

  const page = meta.pages[pdfPage - 1];
  if (!page) {
    return String(pdfPage);
  }

  if (page.region === "front-matter") {
    return `Front matter ${page.displayIndex}`;
  }

  return page.printedLabel ?? String(page.displayIndex);
}

export function getPageFooterLabel(
  languageId: string,
  volumeId: string,
  pdfPage: number,
): string {
  const meta = getVolumePageMeta(languageId, volumeId);
  if (!meta) {
    return `Page ${pdfPage}`;
  }

  const page = meta.pages[pdfPage - 1];
  if (!page) {
    return `Page ${pdfPage}`;
  }

  if (page.region === "front-matter") {
    return `Front matter ${page.displayIndex} of ${meta.frontMatterPageCount}`;
  }

  const bookPage = page.printedLabel ?? String(page.displayIndex);
  return `Page ${bookPage} of ${meta.bodyPageCount}`;
}

export function getProgressFooterLabel(
  languageId: string,
  volumeId: string,
  pdfPage: number,
): string {
  return getPageFooterLabel(languageId, volumeId, pdfPage);
}

export function pdfPageFromBookPage(
  meta: VolumePageMeta | null,
  bookPage: number,
): number | null {
  if (!meta || bookPage < 1 || bookPage > meta.bodyPageCount) {
    return null;
  }

  return meta.frontMatterPageCount + bookPage;
}
