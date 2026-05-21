import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_LANGUAGE_TITLE,
  LANGUAGES,
  ROMAN_URDU_LANGUAGE_ID,
} from "./language-registry";
import type { LanguageAssetManifest, VolumeAssetManifest } from "./types";

const DEFAULT_FILE_PATTERN = "page-{page}.webp";
const DEFAULT_EXTENSION = "webp";
const ASSET_REPO_OWNER = "SahilHasnain";
const ASSET_REPO_NAME = "shifa-shareef-assets";
const ASSET_REPO_REF = "main";
const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/${ASSET_REPO_OWNER}/${ASSET_REPO_NAME}@${ASSET_REPO_REF}`;

function buildVolumeManifest(
  languageId: string,
  volumeId: string,
  totalPages: number,
  deliveryMode: "bundled" | "remote" | "hybrid",
): VolumeAssetManifest {
  return {
    id: volumeId,
    version: "2026-05-21-1",
    totalPages,
    deliveryMode,
    baseUrl:
      deliveryMode === "bundled"
        ? undefined
        : `${CDN_BASE_URL}/pages/${languageId}/${volumeId}`,
    filePattern: DEFAULT_FILE_PATTERN,
    extension: DEFAULT_EXTENSION,
  };
}

export const LANGUAGE_ASSET_MANIFESTS: LanguageAssetManifest[] = LANGUAGES.map(
  (language) => ({
    languageId: language.id,
    title: language.title,
    version: "2026-05-21-1",
    volumes: language.volumes.map((volume) =>
      buildVolumeManifest(
        language.id,
        volume.id,
        volume.totalPages,
        "remote",
      ),
    ),
  }),
);

export const DEFAULT_LANGUAGE_ASSET_MANIFEST =
  LANGUAGE_ASSET_MANIFESTS.find(
    (manifest) => manifest.languageId === DEFAULT_LANGUAGE_ID,
  ) ?? {
    languageId: DEFAULT_LANGUAGE_ID,
    title: DEFAULT_LANGUAGE_TITLE,
    version: "fallback-bundled-v1",
    volumes: [],
  };

export function getLanguageAssetManifest(languageId?: string | null) {
  return (
    LANGUAGE_ASSET_MANIFESTS.find(
      (manifest) => manifest.languageId === languageId,
    ) ?? DEFAULT_LANGUAGE_ASSET_MANIFEST
  );
}

export function getVolumeAssetManifest(
  languageId: string | null | undefined,
  volumeId?: string | null,
) {
  const manifest = getLanguageAssetManifest(languageId);

  return (
    manifest.volumes.find((volume) => volume.id === volumeId) ??
    manifest.volumes[0]
  );
}

export function getRemoteManifestUrl(languageId: string) {
  return `${CDN_BASE_URL}/manifests/${languageId}.json`;
}

export function getRemotePageUrl(
  languageId: string,
  volumeId: string,
  page: number,
) {
  const manifest = getVolumeAssetManifest(languageId, volumeId);
  if (!manifest?.baseUrl) {
    return null;
  }

  const pageToken = String(page).padStart(3, "0");
  const filename = manifest.filePattern.replace("{page}", pageToken);
  return `${manifest.baseUrl.replace(/\/+$/, "")}/${filename}`;
}
