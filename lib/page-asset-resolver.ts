import {
  getLanguageAssetManifest,
} from "../data/asset-manifests";
import { getPageImageForLanguageVolume } from "../data/languages";
import type { ResolvedPageAsset } from "../data/types";
import {
  cacheRemotePage,
  getCachedPageInfo,
  getCachedPageUri,
} from "./page-asset-cache";
import { getRuntimeVolumeAssetManifest } from "./runtime-asset-manifests";

type ResolvePageAssetOptions = {
  cacheRemote?: boolean;
};

const inFlightDownloads = new Map<string, Promise<string | null>>();

function getPageCacheKey(languageId: string, volumeId: string, page: number) {
  return `${languageId}:${volumeId}:${page}`;
}

function buildRemotePageUrl(baseUrl: string, filePattern: string, page: number) {
  const pageToken = String(page).padStart(3, "0");
  const filename = filePattern.replace("{page}", pageToken);
  return `${baseUrl.replace(/\/+$/, "")}/${filename}`;
}

async function cacheRemotePageOnce(
  languageId: string,
  volumeId: string,
  page: number,
  remoteUri: string,
  extension: string,
) {
  const cacheKey = getPageCacheKey(languageId, volumeId, page);
  const existingRequest = inFlightDownloads.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = cacheRemotePage(
    languageId,
    volumeId,
    page,
    remoteUri,
    extension,
  )
    .catch(() => null)
    .finally(() => {
      inFlightDownloads.delete(cacheKey);
    });

  inFlightDownloads.set(cacheKey, request);
  return request;
}

export async function resolvePageAsset(
  languageId: string,
  volumeId: string,
  page: number,
  options: ResolvePageAssetOptions = {},
): Promise<ResolvedPageAsset> {
  const languageManifest = getLanguageAssetManifest(languageId);
  const volumeManifest = await getRuntimeVolumeAssetManifest(languageId, volumeId);
  const manifestVersion = volumeManifest?.version ?? languageManifest.version;

  if (!volumeManifest) {
    return {
      kind: "missing",
      manifestVersion,
      languageId,
      volumeId,
      page,
    };
  }

  const cachedPage = await getCachedPageInfo(
    languageId,
    volumeId,
    page,
    volumeManifest.extension,
  );

  if (cachedPage.exists && cachedPage.uri) {
    return {
      kind: "local",
      source: { uri: cachedPage.uri },
      uri: cachedPage.uri,
      cacheUri: cachedPage.uri,
      manifestVersion,
      languageId,
      volumeId,
      page,
    };
  }

  const remoteUri = volumeManifest?.baseUrl
    ? buildRemotePageUrl(volumeManifest.baseUrl, volumeManifest.filePattern, page)
    : null;
  if (remoteUri) {
    if (options.cacheRemote) {
      const cachedUri = await cacheRemotePageOnce(
        languageId,
        volumeId,
        page,
        remoteUri,
        volumeManifest.extension,
      );

      if (cachedUri) {
        return {
          kind: "local",
          source: { uri: cachedUri },
          uri: cachedUri,
          cacheUri: cachedUri,
          manifestVersion,
          languageId,
          volumeId,
          page,
        };
      }
    }

    return {
      kind: "remote",
      source: { uri: remoteUri },
      uri: remoteUri,
      cacheUri:
        getCachedPageUri(languageId, volumeId, page, volumeManifest.extension) ??
        undefined,
      manifestVersion,
      languageId,
      volumeId,
      page,
    };
  }

  const bundledSource = getPageImageForLanguageVolume(languageId, volumeId, page);
  if (bundledSource) {
    return {
      kind: "bundled",
      source: bundledSource,
      manifestVersion,
      languageId,
      volumeId,
      page,
    };
  }

  return {
    kind: "missing",
    manifestVersion,
    languageId,
    volumeId,
    page,
  };
}

export async function prefetchPageAssets(
  languageId: string,
  volumeId: string,
  pages: number[],
) {
  const volumeManifest = await getRuntimeVolumeAssetManifest(languageId, volumeId);
  if (!volumeManifest?.baseUrl) {
    return;
  }

  await Promise.all(
    pages.map((page) =>
      resolvePageAsset(languageId, volumeId, page, { cacheRemote: true }).catch(
        () => null,
      ),
    ),
  );
}

export async function downloadVolumeAssets(
  languageId: string,
  volumeId: string,
  totalPages: number,
  onProgress?: (completedPages: number, totalPages: number) => void,
) {
  const volumeManifest = await getRuntimeVolumeAssetManifest(languageId, volumeId);
  if (!volumeManifest?.baseUrl) {
    return 0;
  }

  let completed = 0;

  for (let page = 1; page <= totalPages; page += 1) {
    const result = await resolvePageAsset(languageId, volumeId, page, {
      cacheRemote: true,
    });

    if (result.kind === "local" || result.kind === "bundled") {
      completed += 1;
      onProgress?.(completed, totalPages);
    }
  }

  return completed;
}
