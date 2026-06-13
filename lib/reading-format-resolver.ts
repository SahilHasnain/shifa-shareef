import type { ReadingFormatPreference, Volume } from "../data/types";

const EPUB_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/SahilHasnain/shifa-shareef-assets@main/epub";

export function getVolumeAvailableFormats(
  volume: Volume,
): ReadonlyArray<ReadingFormatPreference> {
  return volume.availableFormats ?? [volume.format];
}

export function resolveReadingFormat(
  preference: ReadingFormatPreference,
  volume: Volume,
): ReadingFormatPreference {
  const available = getVolumeAvailableFormats(volume);

  if (available.includes(preference)) {
    return preference;
  }

  const fallback: ReadingFormatPreference = preference === "epub" ? "image" : "epub";
  if (available.includes(fallback)) {
    return fallback;
  }

  return volume.format;
}

export function withReadingFormat(
  volume: Volume,
  format: ReadingFormatPreference,
): Volume {
  return {
    ...volume,
    format,
  };
}

export function getResolvedVolume(
  volume: Volume,
  preference: ReadingFormatPreference,
): Volume {
  return withReadingFormat(volume, resolveReadingFormat(preference, volume));
}

export function getEpubUrl(languageId: string, volumeId: string): string {
  return `${EPUB_CDN_BASE}/${languageId}/${volumeId}.epub`;
}

export function getReadingFormatLabel(format: ReadingFormatPreference): string {
  return format === "epub" ? "EPUB" : "PDF";
}

export function getReadingFormatStatusMessage(
  preference: ReadingFormatPreference,
  volume: Volume,
): string | null {
  const available = getVolumeAvailableFormats(volume);
  const resolved = resolveReadingFormat(preference, volume);

  if (resolved !== preference) {
    return preference === "epub"
      ? "EPUB is not available for this edition. Using PDF instead."
      : "PDF is not available for this edition. Using EPUB instead.";
  }

  if (available.length === 1) {
    return available[0] === "epub"
      ? "This edition is available as EPUB only."
      : "This edition is available as PDF only.";
  }

  return null;
}
