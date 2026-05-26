import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getVolumeAssetManifest } from "../data/asset-manifests";
import { getCachedPageCount, removeVolumeCache } from "../lib/page-asset-cache";
import { downloadVolumeAssets } from "../lib/page-asset-resolver";

type VolumeDownloadState = {
  cachedPages: number;
  totalPages: number;
  isDownloading: boolean;
  progressPercent: number;
  deliveryMode: "bundled" | "remote" | "hybrid";
  canDownload: boolean;
};

export function useVolumeDownload(
  languageId: string,
  volumeId: string,
  totalPages: number,
) {
  const scopeKey = `${languageId}:${volumeId}`;
  const activeScopeRef = useRef(scopeKey);
  const manifest = useMemo(
    () => getVolumeAssetManifest(languageId, volumeId),
    [languageId, volumeId],
  );

  const [state, setState] = useState<VolumeDownloadState>({
    cachedPages: 0,
    totalPages,
    isDownloading: false,
    progressPercent: 0,
    deliveryMode: manifest?.deliveryMode ?? "bundled",
    canDownload: Boolean(manifest?.baseUrl),
  });

  useEffect(() => {
    activeScopeRef.current = scopeKey;
    setState({
      cachedPages: 0,
      totalPages,
      isDownloading: false,
      progressPercent: 0,
      deliveryMode: manifest?.deliveryMode ?? "bundled",
      canDownload: Boolean(manifest?.baseUrl),
    });
  }, [manifest?.baseUrl, manifest?.deliveryMode, scopeKey, totalPages]);

  const refresh = useCallback(async () => {
    const cachedPages = await getCachedPageCount(
      languageId,
      volumeId,
      manifest?.extension ?? "webp",
    );

    setState((previousState) => ({
      ...previousState,
      cachedPages,
      totalPages,
      deliveryMode: manifest?.deliveryMode ?? "bundled",
      canDownload: Boolean(manifest?.baseUrl),
      progressPercent:
        totalPages > 0 ? Math.round((cachedPages / totalPages) * 100) : 0,
    }));
  }, [languageId, manifest?.baseUrl, manifest?.deliveryMode, manifest?.extension, totalPages, volumeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const downloadAll = useCallback(async () => {
    if (!manifest?.baseUrl) {
      return;
    }

    const requestScope = scopeKey;

    if (activeScopeRef.current === requestScope) {
      setState((previousState) => ({
        ...previousState,
        isDownloading: true,
      }));
    }

    try {
      await downloadVolumeAssets(languageId, volumeId, totalPages, (completedPages) => {
        if (activeScopeRef.current !== requestScope) {
          return;
        }

        setState((previousState) => ({
          ...previousState,
          cachedPages: completedPages,
          isDownloading: true,
          progressPercent:
            totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0,
        }));
      });
    } finally {
      if (activeScopeRef.current === requestScope) {
        setState((previousState) => ({
          ...previousState,
          isDownloading: false,
        }));
        await refresh();
      }
    }
  }, [languageId, manifest?.baseUrl, refresh, scopeKey, totalPages, volumeId]);

  const removeDownload = useCallback(async () => {
    await removeVolumeCache(languageId, volumeId);
    await refresh();
  }, [languageId, refresh, volumeId]);

  const isFullyDownloaded = state.cachedPages >= totalPages && totalPages > 0;
  const isPartiallyDownloaded =
    state.cachedPages > 0 && state.cachedPages < totalPages;

  return {
    ...state,
    isFullyDownloaded,
    isPartiallyDownloaded,
    refresh,
    downloadAll,
    removeDownload,
  };
}
