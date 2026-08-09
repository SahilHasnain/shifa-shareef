import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LegacyFileSystem from "expo-file-system/legacy";

import {
  getChapterAssetBaseUrl,
  getChapterManifestUrl,
  getEpubUrl,
} from "./epub-url";
import {
  clearContentCache,
  getCachedChapterFileCount,
  hasCachedChapter,
  saveCachedChapter,
  saveCachedCss,
} from "./reader-content-cache";

const DOWNLOADS_META_KEY = "shifa-shareef:volume-downloads";

type DownloadMeta = {
  languageId: string;
  volumeId: string;
  downloadedAt: string;
  chapterCount: number;
};

export type VolumeDownloadStatus = "none" | "partial" | "complete";

export type VolumeDownloadState = {
  languageId: string;
  volumeId: string;
  totalChapters: number | null;
  cachedChapters: number;
  status: VolumeDownloadStatus;
  downloadedAt?: string;
};

export type VolumeDownloadProgress = {
  completed: number;
  total: number;
};

export type VolumeDownloadResult = {
  ok: boolean;
  reason?: "cancelled" | "partial" | string;
  completed: number;
  total: number;
};

type ManifestItem = {
  id?: string;
  title?: string;
  href?: string;
};

class DownloadCancelledError extends Error {
  constructor() {
    super("Download cancelled");
  }
}

export function getVolumeManifestStorageKey(
  languageId: string,
  volumeId: string,
): string {
  return `shifa-shareef:chapter-manifest:${languageId}:${volumeId}`;
}

function downloadKey(languageId: string, volumeId: string): string {
  return `${languageId}:${volumeId}`;
}

function resolveChapterUrl(
  languageId: string,
  volumeId: string,
  href: string,
): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `${getChapterAssetBaseUrl(languageId, volumeId)}/${href.replace(/^\.\//, "")}`;
}

function extractReadableContent(html: string): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch?.[1] ?? "";
  const stylesheetLinks =
    headContent.match(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi) ?? [];
  const embeddedStyles =
    headContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1] ?? html;

  return [...stylesheetLinks, ...embeddedStyles, bodyContent].join("\n");
}

async function readDownloadMeta(): Promise<Record<string, DownloadMeta>> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DownloadMeta>;
  } catch {
    return {};
  }
}

async function writeDownloadMeta(
  meta: Record<string, DownloadMeta>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(meta));
  } catch {}
}

function getEpubCacheUri(languageId: string, volumeId: string): string {
  const filename = `${volumeId}.epub`;
  const languageSafeFilename = `${languageId}-${filename}`;
  return `${LegacyFileSystem.documentDirectory}${languageSafeFilename}`;
}

async function ensureEpubDownloaded(
  languageId: string,
  volumeId: string,
): Promise<void> {
  const uri = getEpubCacheUri(languageId, volumeId);
  const info = await LegacyFileSystem.getInfoAsync(uri);
  if (info.exists) return;
  await LegacyFileSystem.downloadAsync(getEpubUrl(languageId, volumeId), uri);
}

const downloadTokens = new Map<string, number>();

export function cancelVolumeDownload(languageId: string, volumeId: string) {
  const key = downloadKey(languageId, volumeId);
  downloadTokens.set(key, (downloadTokens.get(key) ?? 0) + 1);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 20000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function getVolumeDownloadState(
  languageId: string,
  volumeId: string,
): Promise<VolumeDownloadState> {
  const meta = await readDownloadMeta();
  const metaEntry = meta[downloadKey(languageId, volumeId)];

  let chapterHrefs: string[] | null = null;
  try {
    const raw = await AsyncStorage.getItem(
      getVolumeManifestStorageKey(languageId, volumeId),
    );
    if (raw) {
      const parsed = JSON.parse(raw) as { chapters?: ManifestItem[] };
      if (Array.isArray(parsed.chapters)) {
        chapterHrefs = parsed.chapters
          .map((chapter) => chapter.href)
          .filter((href): href is string => Boolean(href));
      }
    }
  } catch {}

  const totalChapters =
    chapterHrefs?.length ?? metaEntry?.chapterCount ?? null;

  let cachedChapters: number;
  if (Array.isArray(chapterHrefs) && chapterHrefs.length > 0) {
    cachedChapters = chapterHrefs.filter((href) =>
      hasCachedChapter(languageId, volumeId, href),
    ).length;
  } else {
    cachedChapters = getCachedChapterFileCount(languageId, volumeId);
  }

  let status: VolumeDownloadStatus;
  if (totalChapters != null && totalChapters > 0) {
    status =
      cachedChapters >= totalChapters
        ? "complete"
        : cachedChapters > 0
          ? "partial"
          : "none";
  } else {
    status = cachedChapters > 0 ? "partial" : "none";
  }

  return {
    languageId,
    volumeId,
    totalChapters,
    cachedChapters,
    status,
    downloadedAt: metaEntry?.downloadedAt,
  };
}

export async function downloadVolume(
  languageId: string,
  volumeId: string,
  onProgress?: (progress: VolumeDownloadProgress) => void,
): Promise<VolumeDownloadResult> {
  const key = downloadKey(languageId, volumeId);
  const token = (downloadTokens.get(key) ?? 0) + 1;
  downloadTokens.set(key, token);

  const isCancelled = () => downloadTokens.get(key) !== token;

  try {
    let chapters: ManifestItem[];
    try {
      const manifestUrl = getChapterManifestUrl(languageId, volumeId);
      const manifestResponse = await fetchWithTimeout(manifestUrl);
      const parsed = (await manifestResponse.json()) as {
        chapters?: ManifestItem[];
      };
      if (!Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
        throw new Error("Manifest has no chapters");
      }
      chapters = parsed.chapters.filter((chapter) => Boolean(chapter.href));
      await AsyncStorage.setItem(
        getVolumeManifestStorageKey(languageId, volumeId),
        JSON.stringify(parsed),
      );
    } catch (err) {
      return {
        ok: false,
        reason:
          err instanceof Error ? err.message : "Manifest fetch failed",
        completed: 0,
        total: 0,
      };
    }

    if (isCancelled()) {
      return { ok: false, reason: "cancelled", completed: 0, total: chapters.length };
    }

    try {
      const cssUrl = `${getChapterAssetBaseUrl(languageId, volumeId)}/styles/book.css`;
      const cssResponse = await fetchWithTimeout(cssUrl);
      const css = await cssResponse.text();
      await saveCachedCss(languageId, volumeId, css);
    } catch {}

    let completed = 0;
    const total = chapters.length;

    const runChapter = async (chapter: ManifestItem) => {
      if (isCancelled()) throw new DownloadCancelledError();
      const href = chapter.href as string;
      try {
        const url = resolveChapterUrl(languageId, volumeId, href);
        const response = await fetchWithTimeout(url);
        const content = extractReadableContent(await response.text());
        await saveCachedChapter(languageId, volumeId, href, content);
      } catch {
        if (isCancelled()) throw new DownloadCancelledError();
      }
      completed += 1;
      onProgress?.({ completed, total });
    };

    await runWithConcurrency(chapters, 4, runChapter);

    try {
      await ensureEpubDownloaded(languageId, volumeId);
    } catch {}

    const downloaded = chapters.reduce(
      (count, chapter) =>
        count +
        (hasCachedChapter(languageId, volumeId, chapter.href as string) ? 1 : 0),
      0,
    );

    await writeDownloadMeta({
      ...(await readDownloadMeta()),
      [key]: {
        languageId,
        volumeId,
        downloadedAt: new Date().toISOString(),
        chapterCount: total,
      },
    });

    return {
      ok: downloaded >= total,
      reason: downloaded >= total ? undefined : "partial",
      completed: downloaded,
      total,
    };
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof DownloadCancelledError ? "cancelled" : "Download failed",
      completed: 0,
      total: 0,
    };
  } finally {
    if (downloadTokens.get(key) === token) {
      downloadTokens.delete(key);
    }
  }
}

export async function removeVolumeDownload(
  languageId: string,
  volumeId: string,
): Promise<void> {
  cancelVolumeDownload(languageId, volumeId);
  await clearContentCache(languageId, volumeId);
  await AsyncStorage.removeItem(getVolumeManifestStorageKey(languageId, volumeId));

  try {
    const uri = getEpubCacheUri(languageId, volumeId);
    const info = await LegacyFileSystem.getInfoAsync(uri);
    if (info.exists) {
      await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {}

  const meta = await readDownloadMeta();
  delete meta[downloadKey(languageId, volumeId)];
  await writeDownloadMeta(meta);
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const runnerCount = Math.max(1, Math.min(concurrency, items.length));
  const runners = Array.from({ length: runnerCount }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}