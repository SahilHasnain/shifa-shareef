import * as FileSystem from "expo-file-system/legacy";

const CACHE_ROOT = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}page-assets/`
  : null;

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-");
}

function getPageFilename(page: number, extension = "webp") {
  return `page-${String(page).padStart(3, "0")}.${extension}`;
}

export function getPageAssetCacheRoot() {
  return CACHE_ROOT;
}

export function getVolumeCacheDirectory(languageId: string, volumeId: string) {
  if (!CACHE_ROOT) {
    return null;
  }

  return `${CACHE_ROOT}${sanitizeSegment(languageId)}/${sanitizeSegment(volumeId)}/`;
}

export function getCachedPageUri(
  languageId: string,
  volumeId: string,
  page: number,
  extension = "webp",
) {
  const volumeDirectory = getVolumeCacheDirectory(languageId, volumeId);
  if (!volumeDirectory) {
    return null;
  }

  return `${volumeDirectory}${getPageFilename(page, extension)}`;
}

export async function ensureVolumeCacheDirectory(
  languageId: string,
  volumeId: string,
) {
  const volumeDirectory = getVolumeCacheDirectory(languageId, volumeId);
  if (!volumeDirectory) {
    return null;
  }

  await FileSystem.makeDirectoryAsync(volumeDirectory, {
    intermediates: true,
  });

  return volumeDirectory;
}

export async function getCachedPageInfo(
  languageId: string,
  volumeId: string,
  page: number,
  extension = "webp",
) {
  const uri = getCachedPageUri(languageId, volumeId, page, extension);
  if (!uri) {
    return {
      exists: false,
      uri: null,
    };
  }

  const info = await FileSystem.getInfoAsync(uri);
  return {
    exists: info.exists,
    uri,
  };
}

export async function cacheRemotePage(
  languageId: string,
  volumeId: string,
  page: number,
  remoteUri: string,
  extension = "webp",
) {
  const targetUri = getCachedPageUri(languageId, volumeId, page, extension);
  if (!targetUri) {
    return null;
  }

  await ensureVolumeCacheDirectory(languageId, volumeId);

  const existingInfo = await FileSystem.getInfoAsync(targetUri);
  if (existingInfo.exists) {
    return targetUri;
  }

  await FileSystem.downloadAsync(remoteUri, targetUri);
  return targetUri;
}

export async function getCachedPageCount(
  languageId: string,
  volumeId: string,
  extension = "webp",
) {
  const volumeDirectory = getVolumeCacheDirectory(languageId, volumeId);
  if (!volumeDirectory) {
    return 0;
  }

  const info = await FileSystem.getInfoAsync(volumeDirectory);
  if (!info.exists) {
    return 0;
  }

  const entries = await FileSystem.readDirectoryAsync(volumeDirectory);
  return entries.filter((entry) => entry.endsWith(`.${extension}`)).length;
}

export async function removeVolumeCache(languageId: string, volumeId: string) {
  const volumeDirectory = getVolumeCacheDirectory(languageId, volumeId);
  if (!volumeDirectory) {
    return;
  }

  const info = await FileSystem.getInfoAsync(volumeDirectory);
  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(volumeDirectory, { idempotent: true });
}
