import { PAGE_IMAGES as VOLUME1_PAGE_IMAGES } from "./volumes/volume1/pages";

export const PAGE_IMAGES: Record<number, any> = VOLUME1_PAGE_IMAGES;

export function getPageImage(pageNum: number): any {
  return PAGE_IMAGES[pageNum] || null;
}
