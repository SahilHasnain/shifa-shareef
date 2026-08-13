import { Directory, File, Paths } from "expo-file-system";
import { downloadAsync, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";

function getContentDir(): Directory {
  return new Directory(Paths.document, "reader-content");
}

function getChapterPath(languageId: string, volumeId: string, href: string): string {
  return new File(getContentDir(), `${languageId}-${volumeId}-${href.replace(/[^a-zA-Z0-9_-]/g, "_")}`).uri;
}

function getCssPath(languageId: string, volumeId: string): string {
  return new File(getContentDir(), `${languageId}-${volumeId}-styles_book_css`).uri;
}

function getDir(languageId: string, volumeId: string): Directory {
  return new Directory(getContentDir(), `${languageId}-${volumeId}`);
}

function getImagesDir(languageId: string, volumeId: string): Directory {
  return new Directory(getContentDir(), `${languageId}-${volumeId}-images`);
}

function getImagePath(languageId: string, volumeId: string, url: string): string {
  return new File(getImagesDir(languageId, volumeId), url.replace(/[^a-zA-Z0-9._-]/g, "_")).uri;
}

export async function getCachedChapter(
  languageId: string,
  volumeId: string,
  href: string,
): Promise<string | null> {
  try {
    const path = getChapterPath(languageId, volumeId, href);
    const file = new File(path);
    if (!file.exists) return null;
    return await readAsStringAsync(path, { encoding: "utf8" });
  } catch {
    return null;
  }
}

export async function saveCachedChapter(
  languageId: string,
  volumeId: string,
  href: string,
  content: string,
): Promise<void> {
  try {
    const dir = getDir(languageId, volumeId);
    dir.create({ intermediates: true, idempotent: true });
    const path = getChapterPath(languageId, volumeId, href);
    await writeAsStringAsync(path, content, { encoding: "utf8" });
  } catch {}
}

export async function getCachedCss(
  languageId: string,
  volumeId: string,
): Promise<string | null> {
  try {
    const path = getCssPath(languageId, volumeId);
    const file = new File(path);
    if (!file.exists) return null;
    return await readAsStringAsync(path, { encoding: "utf8" });
  } catch {
    return null;
  }
}

export async function saveCachedCss(
  languageId: string,
  volumeId: string,
  css: string,
): Promise<void> {
  try {
    const dir = getContentDir();
    dir.create({ intermediates: true, idempotent: true });
    const path = getCssPath(languageId, volumeId);
    await writeAsStringAsync(path, css, { encoding: "utf8" });
  } catch {}
}

export async function clearContentCache(
  languageId: string,
  volumeId: string,
): Promise<void> {
  try {
    const dir = getDir(languageId, volumeId);
    if (dir.exists) dir.delete();
    const imagesDir = getImagesDir(languageId, volumeId);
    if (imagesDir.exists) imagesDir.delete();
    const cssPath = getCssPath(languageId, volumeId);
    const cssFile = new File(cssPath);
    if (cssFile.exists) cssFile.delete();
  } catch {}
}

export function getCachedImageUri(
  languageId: string,
  volumeId: string,
  url: string,
): string | null {
  try {
    const path = getImagePath(languageId, volumeId, url);
    const file = new File(path);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

export async function saveCachedImage(
  languageId: string,
  volumeId: string,
  url: string,
): Promise<string | null> {
  try {
    const dir = getImagesDir(languageId, volumeId);
    dir.create({ intermediates: true, idempotent: true });
    const path = getImagePath(languageId, volumeId, url);
    const file = new File(path);
    if (file.exists) return file.uri;
    await downloadAsync(url, path);
    return file.uri;
  } catch {
    return null;
  }
}

const IMG_TAG_RE = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

function resolveImageUrl(src: string, assetBaseUrl: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (/^data:/i.test(src)) return src;
  return `${assetBaseUrl}/${src.replace(/^\.\//, "")}`;
}

export async function getCachedImageDataUri(
  languageId: string,
  volumeId: string,
  url: string,
): Promise<string | null> {
  try {
    const path = getImagePath(languageId, volumeId, url);
    const file = new File(path);
    if (!file.exists) return null;
    const base64 = await readAsStringAsync(path, { encoding: "base64" });
    const mime = /\.svg(\?|$)/i.test(url)
      ? "image/svg+xml"
      : /\.jpe?g(\?|$)/i.test(url)
        ? "image/jpeg"
        : /\.webp(\?|$)/i.test(url)
          ? "image/webp"
          : /\.gif(\?|$)/i.test(url)
            ? "image/gif"
            : "image/png";
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function rewriteImageTags(
  html: string,
  languageId: string,
  volumeId: string,
  assetBaseUrl: string,
): Promise<string> {
  const matches = Array.from(html.matchAll(IMG_TAG_RE));
  if (matches.length === 0) return html;

  let nextHtml = html;
  for (const match of matches) {
    const src = match[1];
    const resolved = resolveImageUrl(src, assetBaseUrl);
    if (resolved === src) continue;
    const dataUri = await getCachedImageDataUri(languageId, volumeId, resolved);
    if (!dataUri) continue;
    nextHtml = nextHtml.split(src).join(dataUri);
  }
  return nextHtml;
}

export function hasCachedChapter(
  languageId: string,
  volumeId: string,
  href: string,
): boolean {
  try {
    return new File(getChapterPath(languageId, volumeId, href)).exists;
  } catch {
    return false;
  }
}

export function getCachedChapterFileCount(
  languageId: string,
  volumeId: string,
): number {
  try {
    const dir = getDir(languageId, volumeId);
    if (!dir.exists) return 0;
    return dir.list().length;
  } catch {
    return 0;
  }
}
