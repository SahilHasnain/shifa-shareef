import { Directory, File, Paths } from "expo-file-system";
import { readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";

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
    const cssPath = getCssPath(languageId, volumeId);
    const cssFile = new File(cssPath);
    if (cssFile.exists) cssFile.delete();
  } catch {}
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
