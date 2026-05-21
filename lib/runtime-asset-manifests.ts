import {
  getLanguageAssetManifest,
  getRemoteManifestUrl,
  getVolumeAssetManifest,
} from "../data/asset-manifests";
import type { LanguageAssetManifest, VolumeAssetManifest } from "../data/types";

const REMOTE_MANIFEST_TIMEOUT_MS = 3500;
const manifestCache = new Map<string, LanguageAssetManifest>();

async function fetchWithTimeout(input: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isValidRemoteManifest(
  manifest: unknown,
): manifest is LanguageAssetManifest {
  if (!manifest || typeof manifest !== "object") {
    return false;
  }

  const candidate = manifest as LanguageAssetManifest;
  return (
    typeof candidate.languageId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.version === "string" &&
    Array.isArray(candidate.volumes)
  );
}

function mergeLanguageManifest(
  localManifest: LanguageAssetManifest,
  remoteManifest: LanguageAssetManifest,
): LanguageAssetManifest {
  return {
    ...localManifest,
    ...remoteManifest,
    volumes: localManifest.volumes.map((localVolume) => {
      const remoteVolume = remoteManifest.volumes.find(
        (volume) => volume.id === localVolume.id,
      );

      return {
        ...localVolume,
        ...remoteVolume,
        baseUrl: remoteVolume?.baseUrl || localVolume.baseUrl,
        filePattern: remoteVolume?.filePattern || localVolume.filePattern,
        extension: remoteVolume?.extension || localVolume.extension,
      };
    }),
  };
}

export async function getRuntimeLanguageAssetManifest(languageId: string) {
  const cachedManifest = manifestCache.get(languageId);
  if (cachedManifest) {
    return cachedManifest;
  }

  const localManifest = getLanguageAssetManifest(languageId);
  const remoteManifestUrl = getRemoteManifestUrl(languageId);

  try {
    const response = await fetchWithTimeout(
      remoteManifestUrl,
      REMOTE_MANIFEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      manifestCache.set(languageId, localManifest);
      return localManifest;
    }

    const remoteManifest = await response.json();
    if (!isValidRemoteManifest(remoteManifest)) {
      manifestCache.set(languageId, localManifest);
      return localManifest;
    }

    const mergedManifest = mergeLanguageManifest(localManifest, remoteManifest);
    manifestCache.set(languageId, mergedManifest);
    return mergedManifest;
  } catch {
    manifestCache.set(languageId, localManifest);
    return localManifest;
  }
}

export async function getRuntimeVolumeAssetManifest(
  languageId: string,
  volumeId: string,
): Promise<VolumeAssetManifest | undefined> {
  const languageManifest = await getRuntimeLanguageAssetManifest(languageId);
  return (
    languageManifest.volumes.find((volume) => volume.id === volumeId) ??
    getVolumeAssetManifest(languageId, volumeId)
  );
}

export function clearRuntimeManifestCache(languageId?: string) {
  if (languageId) {
    manifestCache.delete(languageId);
    return;
  }

  manifestCache.clear();
}
