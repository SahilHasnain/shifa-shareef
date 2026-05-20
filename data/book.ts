import { DEFAULT_VOLUME_ID, getVolumeById } from "./volumes";

export const BOOK_TITLE = "Shifa Shareef";
export const SHIFA_PDF_ASSET = require("../assets/pdf/shifa-shareef-v1.pdf");

// Compatibility exports for the current single-volume screens.
export const TOTAL_PAGES = getVolumeById(DEFAULT_VOLUME_ID).totalPages;
export const SECTIONS = getVolumeById(DEFAULT_VOLUME_ID).sections;
