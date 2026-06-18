const EPUB_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/SahilHasnain/shifa-shareef-assets@main/epub";

export function getEpubUrl(languageId: string, volumeId: string): string {
  return `${EPUB_CDN_BASE}/${languageId}/${volumeId}.epub`;
}

export function getChapterManifestUrl(languageId: string, volumeId: string): string {
  return `${EPUB_CDN_BASE}/${languageId}/${volumeId}/manifest.json`;
}

export function getChapterAssetBaseUrl(languageId: string, volumeId: string): string {
  return `${EPUB_CDN_BASE}/${languageId}/${volumeId}`;
}
