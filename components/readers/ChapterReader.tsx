import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Modal, PanResponder, Platform, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SystemUI from "expo-system-ui";
import { WebView } from "react-native-webview";

import { BOOK_TITLE } from "../../data/book";
import type { Language, Volume } from "../../data/types";
import { typography } from "../../constants/theme";
import { useAppTheme } from "../../hooks/useAppTheme";
import { READER_THEME_COLORS, useReaderTheme } from "../../hooks/useReaderTheme";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReaderBrightness } from "../../hooks/useReaderBrightness";
import { useReadingSessions } from "../../hooks/useReadingSessions";
import { getCurrentSection } from "../../lib/section-resolver";
import { getCachedChapter, saveCachedChapter, getCachedCss, saveCachedCss, saveCachedImage, rewriteImageTags } from "../../lib/reader-content-cache";

type ChapterManifest = {
  title?: string;
  chapters: ChapterManifestItem[];
  toc?: ChapterTocItem[];
};

type ChapterManifestItem = {
  id?: string;
  title: string;
  href: string;
  startProgressPercent?: number;
  endProgressPercent?: number;
};

type LoadedChapter = {
  index: number;
  html: string;
};

type ChapterTocItem = {
  label: string;
  href: string;
  src: string;
  level: number;
  chapterIndex: number;
};

type ChapterReaderProps = {
  language: Language;
  volume: Volume;
  volumeDisplayTitle: string;
  showVolumeLabel: boolean;
  manifestUrl: string;
  assetBaseUrl: string;
  initialLocator?: string;
  initialProgressPercent?: number;
  onProgressChange: (locator: string, progressPercent: number) => void;
  onFallbackRequested: () => void;
};

function parseLocator(locator?: string): { chapterIndex: number; chapterProgress: number } | null {
  if (!locator?.startsWith("chapter:")) return null;

  const [, chapterIndexRaw, chapterProgressRaw] = locator.split(":");
  const chapterIndex = Number(chapterIndexRaw);
  const chapterProgress = Number(chapterProgressRaw);

  if (!Number.isFinite(chapterIndex) || !Number.isFinite(chapterProgress)) {
    return null;
  }

  return {
    chapterIndex: Math.max(0, Math.floor(chapterIndex)),
    chapterProgress: Math.min(1, Math.max(0, chapterProgress)),
  };
}

function makeLocator(chapterIndex: number, chapterProgress: number): string {
  return `chapter:${chapterIndex}:${Math.min(1, Math.max(0, chapterProgress)).toFixed(4)}`;
}

function resolveChapterUrl(assetBaseUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `${assetBaseUrl}/${href.replace(/^\.\//, "")}`;
}

function extractReadableContent(html: string): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch?.[1] ?? "";
  const stylesheetLinks = headContent.match(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi) ?? [];
  const embeddedStyles = headContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1] ?? html;

  return [...stylesheetLinks, ...embeddedStyles, bodyContent].join("\n");
}

function getChapterProgressRange(chapter: ChapterManifestItem, index: number, total: number) {
  const fallbackStart = total > 0 ? index / total : 0;
  const fallbackEnd = total > 0 ? (index + 1) / total : 1;

  return {
    start: typeof chapter.startProgressPercent === "number" ? chapter.startProgressPercent : fallbackStart,
    end: typeof chapter.endProgressPercent === "number" ? chapter.endProgressPercent : fallbackEnd,
  };
}

function getInitialChapterIndex(
  manifest: ChapterManifest,
  initialLocator?: string,
  initialProgressPercent?: number,
): number {
  const parsed = parseLocator(initialLocator);
  if (parsed) {
    return Math.min(manifest.chapters.length - 1, parsed.chapterIndex);
  }

  if (typeof initialProgressPercent === "number" && !Number.isNaN(initialProgressPercent)) {
    const progress = Math.min(1, Math.max(0, initialProgressPercent));
    const index = manifest.chapters.findIndex((chapter, chapterIndex) => {
      const range = getChapterProgressRange(chapter, chapterIndex, manifest.chapters.length);
      return progress >= range.start && progress <= range.end;
    });

    if (index >= 0) return index;
  }

  return 0;
}

function buildChapterHtml(chapters: LoadedChapter[], baseUrl: string, initialTheme: (typeof READER_THEME_COLORS)[keyof typeof READER_THEME_COLORS], fontSize: number, inlinedCss?: string): string {
  const chapterSections = chapters
    .map((chapter) => {
      let html = chapter.html;
      if (inlinedCss) {
        html = html.replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi, "");
      }
      return '<section class="reader-chapter" data-chapter-index="' + chapter.index + '">' + html + "</section>";
    })
    .join("\n");

  const themeName = initialTheme.isDark ? "dark" : initialTheme.background === "#F5E6C8" ? "sepia" : "light";

  return [
    "<!DOCTYPE html>",
    '<html data-theme="' + themeName + '">',
    "<head>",
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
    '<base href="' + baseUrl + '">',
    inlinedCss ? "<style>" + inlinedCss + "</style>" : "",
    "<style>",
    ":root { --reader-bg: " + initialTheme.background + "; --reader-text: " + initialTheme.text + "; --reader-font-size: " + fontSize + "px; }",
    ':root[data-theme="dark"], :root[data-theme="sepia"] { --page-bg: var(--reader-bg) !important; --paper: var(--reader-bg) !important; --ink: var(--reader-text) !important; --muted: var(--reader-text) !important; --accent: var(--reader-text) !important; --accent-warm: var(--reader-text) !important; --gold: var(--reader-text) !important; --rule: rgba(201, 169, 97, 0.18) !important; }',
    "html, body { min-height: 100%; margin: 0; padding: 0; background: var(--reader-bg); color: var(--reader-text); }",
    "body { font-size: var(--reader-font-size); line-height: 1.75; padding: 28px 22px 42px; overflow-x: hidden; }",
    'html[data-theme="dark"] body, html[data-theme="dark"] p, html[data-theme="dark"] div, html[data-theme="dark"] span, html[data-theme="dark"] li, html[data-theme="dark"] h1, html[data-theme="dark"] h2, html[data-theme="dark"] h3, html[data-theme="dark"] h4, html[data-theme="dark"] h5, html[data-theme="dark"] h6, html[data-theme="dark"] th, html[data-theme="dark"] td, html[data-theme="dark"] blockquote, html[data-theme="dark"] sup,',
    'html[data-theme="sepia"] body, html[data-theme="sepia"] p, html[data-theme="sepia"] div, html[data-theme="sepia"] span, html[data-theme="sepia"] li, html[data-theme="sepia"] h1, html[data-theme="sepia"] h2, html[data-theme="sepia"] h3, html[data-theme="sepia"] h4, html[data-theme="sepia"] h5, html[data-theme="sepia"] h6, html[data-theme="sepia"] th, html[data-theme="sepia"] td, html[data-theme="sepia"] blockquote, html[data-theme="sepia"] sup { color: var(--reader-text) !important; }',
    "p { margin: 0 0 1em; }",
    "img, svg { max-width: 100%; height: auto; }",
    "a { color: inherit; text-decoration: none; pointer-events: none; }",
    ".reader-chapter { min-height: 70vh; padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid rgba(201, 169, 97, 0.18); }",
    ".reader-chapter:last-child { border-bottom: 0; }",
    "::-webkit-scrollbar { display: none; }",
    "* { scrollbar-width: none; -ms-overflow-style: none; box-sizing: border-box; }",
    "</style>",
    "</head>",
    "<body>",
    '<main id="reader-root">' + chapterSections + "</main>",
    "<script>",
    "var lastSentAt = 0;",
    "var lastRequestAt = 0;",
    "var restored = false;",
    "var requestedNextAfter = null;",
    "var requestedPreviousBefore = null;",
    "function getSections() { return Array.prototype.slice.call(document.querySelectorAll('.reader-chapter')); }",
    "function getActiveSection() { var sections = getSections(); if (sections.length === 0) return null; var probeY = window.scrollY + Math.max(80, window.innerHeight * 0.28); var active = sections[0]; for (var i = 0; i < sections.length; i++) { var section = sections[i]; if (section.offsetTop <= probeY) active = section; } return active; }",
    "function getChapterProgress(section) { if (!section) return 0; var sectionTop = section.offsetTop; var maxScroll = Math.max(1, section.offsetHeight - window.innerHeight); return Math.min(1, Math.max(0, (window.scrollY - sectionTop) / maxScroll)); }",
    "function canRequest() { var now = Date.now(); if (now - lastRequestAt < 800) return false; lastRequestAt = now; return true; }",
    "function maybeRequestNext() { var sections = getSections(); var last = sections[sections.length - 1]; if (!last) return; var afterIndex = Number(last.getAttribute('data-chapter-index')); var distanceFromBottom = last.offsetTop + last.offsetHeight - (window.scrollY + window.innerHeight); if (distanceFromBottom < 900 && requestedNextAfter !== afterIndex && canRequest()) { requestedNextAfter = afterIndex; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NEED_NEXT', afterIndex: afterIndex })); } }",
    "function maybeRequestPrevious() { var sections = getSections(); var first = sections[0]; if (!first) return; var beforeIndex = Number(first.getAttribute('data-chapter-index')); if (window.scrollY - first.offsetTop < 700 && requestedPreviousBefore !== beforeIndex && canRequest()) { requestedPreviousBefore = beforeIndex; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NEED_PREVIOUS', beforeIndex: beforeIndex })); } }",
    "function sendProgress(force) { var now = Date.now(); if (!force && now - lastSentAt < 500) return; lastSentAt = now; var active = getActiveSection(); var chapterIndex = active ? Number(active.getAttribute('data-chapter-index')) : 0; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PROGRESS', chapterIndex: chapterIndex, chapterProgress: getChapterProgress(active) })); maybeRequestNext(); maybeRequestPrevious(); }",
    "function restoreProgress(chapterIndex, progress) { if (restored) return; restored = true; requestAnimationFrame(function() { var section = document.querySelector('.reader-chapter[data-chapter-index=\"' + chapterIndex + '\"]') || getActiveSection(); var maxScroll = section ? Math.max(0, section.offsetHeight - window.innerHeight) : 0; var sectionTop = section ? section.offsetTop : 0; window.scrollTo(0, sectionTop + maxScroll * Math.min(1, Math.max(0, progress || 0))); setTimeout(function() { sendProgress(true); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' })); }, 80); }); }",
    "window.__setTheme = function(bg, textColor, themeName) { var root = document.documentElement; root.style.setProperty('--reader-bg', bg); root.style.setProperty('--reader-text', textColor); root.setAttribute('data-theme', themeName || 'light'); };",
    "window.__setFontSize = function(px) { document.documentElement.style.setProperty('--reader-font-size', px + 'px'); };",
    "document.addEventListener('message', function(event) { try { var message = JSON.parse(event.data); if (message.type === 'RESTORE') restoreProgress(message.chapterIndex, message.chapterProgress); } catch (err) {} });",
    "window.addEventListener('message', function(event) { try { var message = JSON.parse(event.data); if (message.type === 'RESTORE') restoreProgress(message.chapterIndex, message.chapterProgress); } catch (err) {} });",
    "window.__appendChapter = function(index, html) { if (document.querySelector('.reader-chapter[data-chapter-index=\"' + index + '\"]')) return; var e = document.createElement('section'); e.className = 'reader-chapter'; e.setAttribute('data-chapter-index', String(index)); e.innerHTML = html; document.getElementById('reader-root').appendChild(e); requestedNextAfter = null; refreshScroll(); setTimeout(function() { sendProgress(true); }, 80); };",
    "window.__prependChapter = function(index, html) { if (document.querySelector('.reader-chapter[data-chapter-index=\"' + index + '\"]')) return; var root = document.getElementById('reader-root'); var previousHeight = document.documentElement.scrollHeight; var previousScroll = window.scrollY; var e = document.createElement('section'); e.className = 'reader-chapter'; e.setAttribute('data-chapter-index', String(index)); e.innerHTML = html; root.insertBefore(e, root.firstChild); requestedPreviousBefore = null; refreshScroll(); requestAnimationFrame(function() { var heightDelta = document.documentElement.scrollHeight - previousHeight; window.scrollTo(0, previousScroll + heightDelta); setTimeout(function() { sendProgress(true); }, 80); }); };",
    "function refreshScroll() { var height = document.documentElement.scrollHeight; document.body.style.minHeight = (height + 1) + 'px'; requestAnimationFrame(function() { document.body.style.minHeight = ''; }); }",
    "var stuckSentAt = 0;",
    "function sendStuckHint() { var now = Date.now(); if (now - stuckSentAt < 5000) return; stuckSentAt = now; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STUCK' })); }",
    "function checkStuck() { var atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4; if (atBottom && requestedNextAfter !== null) { sendStuckHint(); } }",
    "window.addEventListener('scroll', function() { sendProgress(false); checkStuck(); }, { passive: true });",
    "window.addEventListener('load', function() { restoreProgress(" + (chapters[0]?.index ?? 0) + ", 0); });",
    "setTimeout(function() { restoreProgress(" + (chapters[0]?.index ?? 0) + ", 0); }, 250);",
    "document.body.addEventListener('click', function() { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOGGLE_CONTROLS' })); });",
    "window.__initialTheme = '" + themeName + "'; __setTheme(__initialTheme);",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

export function ChapterReader({
  language,
  volume,
  volumeDisplayTitle,
  showVolumeLabel,
  manifestUrl,
  assetBaseUrl,
  initialLocator,
  initialProgressPercent,
  onProgressChange,
  onFallbackRequested,
}: ChapterReaderProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { readerTheme, setReaderTheme } = useReaderTheme();
  const themeColors = READER_THEME_COLORS[readerTheme];
  const webViewRef = useRef<WebView>(null);
  const chapterCacheRef = useRef(new Map<string, string>());
  const loadedChapterIndexesRef = useRef(new Set<number>());
  const appendInFlightRef = useRef(new Set<number>());
  const sessionStartTime = useRef(Date.now());
  const sessionMinProgress = useRef(0);
  const sessionMaxProgress = useRef(0);
  const sessionStartProgress = useRef<number | null>(null);
  const sessionCompletedRef = useRef(false);
  const lastSavedLocatorRef = useRef<string | null>(null);
  const initialLocatorRef = useRef(initialLocator);
  const initialProgressPercentRef = useRef(initialProgressPercent);
  const [cachedCss, setCachedCss] = useState<string | null>(null);
  const [cssReady, setCssReady] = useState(false);

  const [manifest, setManifest] = useState<ChapterManifest | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [loadAnchorIndex, setLoadAnchorIndex] = useState(0);
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([]);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [tocVisible, setTocVisible] = useState(false);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const { brightness, panResponder: brightnessPanResponder, setTrackWidthFromLayout } = useReaderBrightness();
  const sliderWidthRef = useRef(1);
  const isScrubbingRef = useRef(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToastMessage(null));
    }, 2500);
  }

  const currentChapter = manifest?.chapters[chapterIndex] ?? null;
  const currentSection = getCurrentSection(volume, {
    progressPercent: currentProgress,
    lastCfi: makeLocator(chapterIndex, chapterProgress),
  }) ?? volume.sections[0];
  const estimatedPage = Math.max(1, Math.round(currentProgress * volume.totalPages) || 1);
  const { isBookmarked, addBookmark, removeBookmark, bookmarks, getBookmarkForLocation } = useBookmarks(volume.id, language.id);
  const { addSession } = useReadingSessions();
  const locationIsBookmarked = isBookmarked(estimatedPage, makeLocator(chapterIndex, chapterProgress), currentProgress);

  const readerHtml = useMemo(() => {
    if (loadedChapters.length === 0 || !cssReady) return null;
    return buildChapterHtml(loadedChapters, `${assetBaseUrl}/`, themeColors, fontSize, cachedCss ?? undefined);
  }, [assetBaseUrl, cachedCss, cssReady, loadedChapters]); // theme, fontSize excluded — applied via injectJavaScript to avoid WebView reload
  const webViewSource = useMemo(() => {
    return readerHtml ? { html: readerHtml } : undefined;
  }, [readerHtml]);

  const calculateGlobalProgress = useCallback((index: number, progressWithinChapter: number) => {
    if (!manifest) return 0;
    const chapter = manifest.chapters[index];
    if (!chapter) return 0;
    const range = getChapterProgressRange(chapter, index, manifest.chapters.length);
    return Math.min(1, Math.max(0, range.start + (range.end - range.start) * progressWithinChapter));
  }, [manifest]);

  const downloadImages = useCallback((html: string) => {
    const urls = Array.from(
      html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
      (match) => {
        const src = match[1];
        if (/^https?:\/\//i.test(src)) return src;
        if (/^data:/i.test(src)) return null;
        return `${assetBaseUrl}/${src.replace(/^\.\//, "")}`;
      },
    ).filter((url): url is string => Boolean(url));

    for (const url of urls) {
      void saveCachedImage(language.id, volume.id, url).catch(() => {});
    }
  }, [assetBaseUrl, language.id, volume.id]);

  const getChapterHtml = useCallback(async (index: number) => {
    if (!manifest) return null;
    const chapter = manifest.chapters[index];
    if (!chapter) return null;

    const chapterUrl = resolveChapterUrl(assetBaseUrl, chapter.href);
    const inMemory = chapterCacheRef.current.get(chapterUrl);
    if (inMemory) {
      return inMemory;
    }

    const onDisk = await getCachedChapter(language.id, volume.id, chapter.href);
    if (onDisk) {
      const rewritten = await rewriteImageTags(onDisk, language.id, volume.id, assetBaseUrl);
      chapterCacheRef.current.set(chapterUrl, rewritten);
      return rewritten;
    }

    const response = await fetch(chapterUrl);
    if (!response.ok) throw new Error(`Failed to load chapter ${index + 1}`);
    const html = extractReadableContent(await response.text());
    void downloadImages(html);
    const rewritten = await rewriteImageTags(html, language.id, volume.id, assetBaseUrl);
    chapterCacheRef.current.set(chapterUrl, rewritten);
    void saveCachedChapter(language.id, volume.id, chapter.href, html);
    return rewritten;
  }, [assetBaseUrl, downloadImages, language.id, manifest, volume.id]);

  const prefetchChapter = useCallback(async (index: number) => {
    if (!manifest || index < 0 || index >= manifest.chapters.length) return;
    const chapter = manifest.chapters[index];
    const chapterUrl = resolveChapterUrl(assetBaseUrl, chapter.href);
    if (chapterCacheRef.current.has(chapterUrl)) return;

    try {
      const cached = await getCachedChapter(language.id, volume.id, chapter.href);
      if (cached) {
        chapterCacheRef.current.set(chapterUrl, cached);
        return;
      }

      const response = await fetch(chapterUrl);
      if (response.ok) {
        const html = extractReadableContent(await response.text());
        void downloadImages(html);
        chapterCacheRef.current.set(chapterUrl, html);
        void saveCachedChapter(language.id, volume.id, chapter.href, html);
      }
    } catch { }
  }, [assetBaseUrl, downloadImages, language.id, manifest, volume.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      try {
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error("Chapter manifest not found");
        const nextManifest = await response.json() as ChapterManifest;

        if (!Array.isArray(nextManifest.chapters) || nextManifest.chapters.length === 0) {
          throw new Error("Chapter manifest has no chapters");
        }

        if (cancelled) return;
        await AsyncStorage.setItem(`shifa-shareef:chapter-manifest:${language.id}:${volume.id}`, JSON.stringify(nextManifest));
        const initialChapterIndex = getInitialChapterIndex(nextManifest, initialLocatorRef.current, initialProgressPercentRef.current);
        setManifest(nextManifest);
        setChapterIndex(initialChapterIndex);
        setLoadAnchorIndex(initialChapterIndex);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === "Chapter manifest not found") {
          onFallbackRequested();
          return;
        }

        const cachedManifest = await AsyncStorage.getItem(`shifa-shareef:chapter-manifest:${language.id}:${volume.id}`).catch(() => null);
        if (cachedManifest) {
          try {
            const parsed = JSON.parse(cachedManifest) as ChapterManifest;
            const initialChapterIndex = getInitialChapterIndex(parsed, initialLocatorRef.current, initialProgressPercentRef.current);
            setManifest(parsed);
            setChapterIndex(initialChapterIndex);
            setLoadAnchorIndex(initialChapterIndex);
            return;
          } catch { }
        }

        setError(err instanceof Error ? err.message : "Failed to load chapter manifest");
        setIsLoading(false);
      }
    }

    void loadManifest();
    return () => { cancelled = true; };
  }, [language.id, manifestUrl, onFallbackRequested, volume.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadCss() {
      try {
        const cached = await getCachedCss(language.id, volume.id);
        if (cached) {
          setCachedCss(cached);
          return;
        }
        const cssUrl = `${assetBaseUrl}/styles/book.css`;
        const res = await fetch(cssUrl);
        if (res.ok) {
          const css = await res.text();
          setCachedCss(css);
          void saveCachedCss(language.id, volume.id, css);
        }
      } catch {}
      finally {
        if (!cancelled) setCssReady(true);
      }
    }
    void loadCss();
    return () => { cancelled = true; };
  }, [assetBaseUrl, language.id, volume.id]);

  useEffect(() => {
    if (!manifest) return;
    const activeManifest = manifest;
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadedChapters([]);
        loadedChapterIndexesRef.current = new Set<number>();
        appendInFlightRef.current = new Set<number>();

        const start = Math.max(0, loadAnchorIndex - 1);
        const end = Math.min(activeManifest.chapters.length - 1, loadAnchorIndex + 1);
        const nextLoaded: LoadedChapter[] = [];

        for (let index = start; index <= end; index += 1) {
          const html = await getChapterHtml(index);
          if (html) {
            nextLoaded.push({ index, html });
            loadedChapterIndexesRef.current.add(index);
          }
        }

        if (cancelled) return;
        setLoadedChapters(nextLoaded);
        if (!cancelled) {
          void prefetchChapter(loadAnchorIndex + 2);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chapter");
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [getChapterHtml, loadAnchorIndex, manifest, prefetchChapter]);

  useEffect(() => {
    StatusBar.setHidden(!controlsVisible, "fade");
    void SystemUI.setBackgroundColorAsync(controlsVisible ? colors.surface.lightCream : themeColors.background).catch(() => { });

    return () => {
      StatusBar.setHidden(false, "fade");
      void SystemUI.setBackgroundColorAsync(colors.surface.lightCream).catch(() => { });
    };
  }, [colors.surface.lightCream, controlsVisible, themeColors.background]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.__setTheme && window.__setTheme(${JSON.stringify(themeColors.background)}, ${JSON.stringify(themeColors.text)}, ${JSON.stringify(readerTheme)}); true;`,
    );
  }, [themeColors]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.__setFontSize && window.__setFontSize(${fontSize}); true;`,
    );
  }, [fontSize]);

  useEffect(() => {
    sessionMinProgress.current = Math.min(sessionMinProgress.current, currentProgress);
    sessionMaxProgress.current = Math.max(sessionMaxProgress.current, currentProgress);
    if (sessionStartProgress.current == null && currentProgress > 0) {
      sessionStartProgress.current = currentProgress;
    }
  }, [currentProgress]);

  const completeSession = useCallback(async () => {
    if (sessionCompletedRef.current) return false;

    const endTime = Date.now();
    const durationMs = endTime - sessionStartTime.current;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const progressDelta = sessionMaxProgress.current - sessionMinProgress.current;
    const pagesRead = Math.max(1, Math.round(progressDelta * volume.totalPages) || 1);
    const startPage = Math.max(1, Math.round(sessionMinProgress.current * volume.totalPages) || 1);
    const endPage = Math.max(startPage, Math.round(sessionMaxProgress.current * volume.totalPages) || startPage);
    const shouldShowModal = durationMs >= 180000 || pagesRead >= 5;

    if (durationMs >= 30000) {
      sessionCompletedRef.current = true;

      await addSession({
        languageId: language.id,
        volumeId: volume.id,
        date: new Date().toISOString(),
        pagesRead,
        startPage,
        endPage,
        durationMinutes,
      });

      if (shouldShowModal) {
        const parts: string[] = [];
        if (pagesRead > 0) parts.push(`${pagesRead} pages`);
        parts.push(`${durationMinutes} min`);
        showToast(parts.join(" "));
        return true;
      }
    }

    return false;
  }, [addSession, language.id, volume]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      void completeSession().then((showingToast) => {
        if (showingToast) {
          setTimeout(() => router.back(), 400);
        } else {
          router.back();
        }
      });
      return true;
    });

    return () => backHandler.remove();
  }, [completeSession, router]);

  const handleBack = () => {
    void completeSession().then((showingToast) => {
      if (showingToast) {
        setTimeout(() => router.back(), 400);
      } else {
        router.back();
      }
    });
  };

  const goToChapter = useCallback((index: number, progress = 0) => {
    if (!manifest) return;
    const nextIndex = Math.min(manifest.chapters.length - 1, Math.max(0, index));
    setChapterIndex(nextIndex);
    setLoadAnchorIndex(nextIndex);
    setChapterProgress(progress);
    setCurrentProgress(calculateGlobalProgress(nextIndex, progress));
    setTocVisible(false);
    setBookmarksVisible(false);
  }, [calculateGlobalProgress, manifest]);

  const updateScrub = useCallback((locationX: number) => {
    const fraction = Math.min(1, Math.max(0, locationX / sliderWidthRef.current));
    setScrubProgress(fraction);
  }, []);

  const seekToProgress = useCallback((progress: number) => {
    if (!manifest || manifest.chapters.length === 0) return;
    const clamped = Math.min(1, Math.max(0, progress));

    let chapterIndex = 0;
    for (let i = 0; i < manifest.chapters.length; i += 1) {
      const range = getChapterProgressRange(manifest.chapters[i], i, manifest.chapters.length);
      if (clamped >= range.start && clamped <= range.end) {
        chapterIndex = i;
        break;
      }
      if (clamped < range.start) break;
    }

    const chapter = manifest.chapters[chapterIndex];
    const range = getChapterProgressRange(chapter, chapterIndex, manifest.chapters.length);
    const chapterProgress = range.end > range.start ? (clamped - range.start) / (range.end - range.start) : 0;
    goToChapter(chapterIndex, Math.min(1, Math.max(0, chapterProgress)));
  }, [goToChapter, manifest]);

  const sliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          isScrubbingRef.current = true;
          updateScrub(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateScrub(event.nativeEvent.locationX);
        },
        onPanResponderRelease: (event) => {
          const fraction = Math.min(1, Math.max(0, event.nativeEvent.locationX / sliderWidthRef.current));
          setScrubProgress(null);
          isScrubbingRef.current = false;
          seekToProgress(fraction);
        },
        onPanResponderTerminate: () => {
          setScrubProgress(null);
          isScrubbingRef.current = false;
        },
      }),
    [seekToProgress, updateScrub],
  );

  const toggleBookmark = async () => {
    const locator = makeLocator(chapterIndex, chapterProgress);
    if (locationIsBookmarked) {
      const bookmarkData = getBookmarkForLocation(locator, currentProgress);
      if (bookmarkData) await removeBookmark(bookmarkData.id);
    } else {
      await addBookmark(estimatedPage, {
        cfi: locator,
        progressPercent: currentProgress,
        label: currentChapter?.title ?? currentSection.title,
      });
    }
  };

  const jumpToBookmark = (bookmark: (typeof bookmarks)[number]) => {
    const parsed = parseLocator(bookmark.cfi);
    if (parsed) {
      goToChapter(parsed.chapterIndex, parsed.chapterProgress);
    } else if (bookmark.progressPercent != null && manifest) {
      goToChapter(getInitialChapterIndex(manifest, undefined, bookmark.progressPercent), 0);
    }
  };

  const appendChapter = useCallback(async (index: number) => {
    if (!manifest || index < 0 || index >= manifest.chapters.length) return;
    if (loadedChapterIndexesRef.current.has(index) || appendInFlightRef.current.has(index)) return;

    appendInFlightRef.current.add(index);
    try {
      const html = await getChapterHtml(index);
      if (!html) return;

      loadedChapterIndexesRef.current.add(index);
      webViewRef.current?.injectJavaScript(
        `window.__appendChapter && window.__appendChapter(${index}, ${JSON.stringify(html)}); true;`,
      );
      void prefetchChapter(index + 1);
    } finally {
      appendInFlightRef.current.delete(index);
    }
  }, [getChapterHtml, manifest, prefetchChapter]);

  const appendPreviousChapter = useCallback(async (index: number) => {
    if (!manifest || index < 0 || index >= manifest.chapters.length) return;
    if (loadedChapterIndexesRef.current.has(index) || appendInFlightRef.current.has(index)) return;

    appendInFlightRef.current.add(index);
    try {
      const html = await getChapterHtml(index);
      if (!html) return;

      loadedChapterIndexesRef.current.add(index);
      webViewRef.current?.injectJavaScript(
        `window.__prependChapter && window.__prependChapter(${index}, ${JSON.stringify(html)}); true;`,
      );
      void prefetchChapter(index - 1);
    } finally {
      appendInFlightRef.current.delete(index);
    }
  }, [getChapterHtml, manifest, prefetchChapter]);

  const handleMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (!data || typeof data !== "string" || (!data.startsWith("{") && !data.startsWith("["))) return;
      const message = JSON.parse(data);

      if (message.type === "READY") {
        setIsLoading(false);
      } else if (message.type === "PROGRESS") {
        const nextChapterIndex = typeof message.chapterIndex === "number" ? message.chapterIndex : chapterIndex;
        const nextChapterProgress = typeof message.chapterProgress === "number" ? message.chapterProgress : 0;
        const nextProgress = calculateGlobalProgress(nextChapterIndex, nextChapterProgress);
        const locator = makeLocator(nextChapterIndex, nextChapterProgress);

        setChapterIndex(nextChapterIndex);
        setChapterProgress(nextChapterProgress);
        setCurrentProgress(nextProgress);

        if (lastSavedLocatorRef.current !== locator) {
          lastSavedLocatorRef.current = locator;
          onProgressChange(locator, nextProgress);
        }
      } else if (message.type === "TOGGLE_CONTROLS") {
        setControlsVisible(true);
      } else if (message.type === "NEED_NEXT") {
        const nextIndex = typeof message.afterIndex === "number" ? message.afterIndex + 1 : chapterIndex + 1;
        void appendChapter(nextIndex);
      } else if (message.type === "NEED_PREVIOUS") {
        const previousIndex = typeof message.beforeIndex === "number" ? message.beforeIndex - 1 : chapterIndex - 1;
        void appendPreviousChapter(previousIndex);
      } else if (message.type === "STUCK") {
        showToast("Loading next chapter... pull up a little and scroll down");
      }
    } catch { }
  };

  const restoreProgress = () => {
    const parsed = parseLocator(initialLocatorRef.current);
    const restoreValue = parsed && parsed.chapterIndex === chapterIndex ? parsed.chapterProgress : chapterProgress;
    webViewRef.current?.postMessage(JSON.stringify({ type: "RESTORE", chapterIndex, chapterProgress: restoreValue }));
    setTimeout(() => setIsLoading(false), 350);
  };

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: themeColors.background }}>
        <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 8 }}>Failed to load reader</Text>
        <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={onFallbackRequested} style={({ pressed }) => ({ borderRadius: 999, backgroundColor: colors.primary.deepGreen, paddingHorizontal: 18, paddingVertical: 10, opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ color: colors.text.onPrimary, fontWeight: typography.weight.bold }}>Open EPUB reader</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {controlsVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.overlay.dark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, gap: 6, zIndex: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable onPress={handleBack} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name="chevron-back" size={24} color={colors.text.onPrimary} />
            </Pressable>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold }}>{BOOK_TITLE}</Text>
              {showVolumeLabel ? (
                <Text style={{ color: colors.text.light, fontSize: typography.size.base, fontWeight: typography.weight.semibold }}>
                  {volumeDisplayTitle}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => setControlsVisible(false)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name="eye-off-outline" size={22} color={colors.text.onPrimary} />
            </Pressable>
            <Pressable onPress={() => { const next = readerTheme === "light" ? "sepia" : readerTheme === "sepia" ? "dark" : "light"; void setReaderTheme(next); }} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name={readerTheme === "dark" ? "moon" : readerTheme === "sepia" ? "cafe" : "sunny"} size={20} color={colors.text.onPrimary} />
            </Pressable>
            <Pressable onPress={toggleBookmark} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: locationIsBookmarked ? colors.secondary.lightGold : colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name={locationIsBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={locationIsBookmarked ? colors.primary.deepGreen : colors.text.onPrimary} />
            </Pressable>
          </View>

          {Platform.OS !== "web" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="sunny-outline" size={16} color={colors.text.onPrimary} />
              <View
                onLayout={(event) => setTrackWidthFromLayout(event.nativeEvent.layout.width)}
                {...brightnessPanResponder.panHandlers}
                style={{ flex: 1, paddingVertical: 10, justifyContent: "center" }}
              >
                <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)" }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${brightness * 100}%`, backgroundColor: colors.text.onPrimary, opacity: 0.85, borderRadius: 2 }} />
                  <View style={{ position: "absolute", top: -5, left: `${brightness * 100}%`, width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: colors.text.onPrimary }} />
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {webViewSource ? (
        <WebView
          ref={webViewRef}
          source={webViewSource}
          onMessage={handleMessage}
          onLoadEnd={restoreProgress}
          onError={() => setIsLoading(false)}
          style={{ flex: 1, backgroundColor: themeColors.background }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      {isLoading && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: themeColors.background }}>
          <ActivityIndicator size="large" color={colors.primary.sageGreen} />
          <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, marginTop: 12 }}>Loading chapter...</Text>
        </View>
      )}

      {controlsVisible && manifest && (
        <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay.dark }}>
          <View style={{ paddingTop: 18, paddingBottom: 18, paddingHorizontal: 20, gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.base, fontWeight: typography.weight.semibold, minWidth: 50 }}>{Math.round((scrubProgress ?? currentProgress) * 100)}%</Text>
              <View
                style={{ flex: 1, height: 24, justifyContent: "center" }}
                onLayout={(event) => { sliderWidthRef.current = Math.max(1, event.nativeEvent.layout.width); }}
                {...sliderPanResponder.panHandlers}
              >
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.overlay.light, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${Math.round((scrubProgress ?? currentProgress) * 100)}%`, backgroundColor: colors.secondary.lightGold, borderRadius: 4 }} />
                </View>
                <View style={{ position: "absolute", left: `${Math.round((scrubProgress ?? currentProgress) * 100)}%`, top: 3, width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: colors.secondary.warmGold, borderWidth: 0 }} />
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                <Pressable onPress={() => setFontSize(prev => Math.max(12, prev - 2))} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ color: colors.text.onPrimary, fontSize: 18, fontWeight: typography.weight.bold }}>A-</Text>
                </Pressable>
                <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, minWidth: 20, textAlign: "center", opacity: 0.7 }}>{fontSize}</Text>
                <Pressable onPress={() => setFontSize(prev => Math.min(28, prev + 2))} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ color: colors.text.onPrimary, fontSize: 18, fontWeight: typography.weight.bold }}>A+</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <Pressable onPress={() => setTocVisible(true)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="list" size={22} color={colors.text.onPrimary} />
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}

      <Modal visible={tocVisible} animationType="slide" transparent onRequestClose={() => setTocVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setTocVisible(false)}>
          <View style={{ maxHeight: "64%", backgroundColor: colors.surface.warmIvory, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, overflow: "hidden" }}>
            <View style={{ width: 42, height: 4, borderRadius: 999, backgroundColor: "rgba(23,61,49,0.18)", alignSelf: "center", marginBottom: 12 }} />
            <View style={{ paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text.primary, fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold }}>Chapters</Text>
                <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm, marginTop: 4 }}>{manifest?.toc?.length ?? manifest?.chapters.length ?? 0} sections</Text>
              </View>
              <Pressable onPress={() => setTocVisible(false)} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(23,61,49,0.08)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 18 }}>
              {(manifest?.toc?.length ? manifest.toc : manifest?.chapters.map((chapter, index) => ({
                label: chapter.title,
                href: chapter.href,
                src: chapter.href,
                level: 0,
                chapterIndex: index,
              })) ?? []).map((item, index) => {
                const isActive = item.chapterIndex === chapterIndex;

                return (
                  <Pressable
                    key={`${item.src}-${index}`}
                    onPress={() => goToChapter(item.chapterIndex, 0)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderRadius: 18,
                      backgroundColor: isActive ? colors.primary.deepGreen : "transparent",
                      paddingLeft: 12 + Math.min(item.level, 3) * 16,
                      paddingRight: 12,
                      paddingVertical: 9,
                      opacity: pressed ? 0.78 : 1,
                    })}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: isActive ? colors.secondary.lightGold : "rgba(23,61,49,0.08)" }}>
                      <Text style={{ color: isActive ? colors.primary.deepGreen : colors.text.tertiary, fontSize: typography.size.xs, fontWeight: typography.weight.bold }}>{index + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, color: isActive ? colors.text.onPrimary : colors.text.primary, fontSize: typography.size.base, lineHeight: 21, fontWeight: isActive ? typography.weight.bold : typography.weight.semibold, textAlign: "left" }} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {isActive ? <Ionicons name="checkmark" size={18} color={colors.secondary.lightGold} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={bookmarksVisible} animationType="slide" transparent onRequestClose={() => setBookmarksVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setBookmarksVisible(false)}>
          <View style={{ maxHeight: "70%", backgroundColor: colors.surface.warmIvory, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <Text style={{ color: colors.text.primary, fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, marginBottom: 16 }}>Bookmarks</Text>
            {bookmarks.length === 0 ? (
              <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base }}>No bookmarks yet.</Text>
            ) : bookmarks.map((bookmark) => (
              <Pressable key={bookmark.id} onPress={() => jumpToBookmark(bookmark)} style={({ pressed }) => ({ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(23,61,49,0.08)", opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ color: colors.text.primary, fontSize: typography.size.base, fontWeight: typography.weight.bold }}>{bookmark.label ?? `Page ${bookmark.page ?? ""}`}</Text>
                <Text style={{ color: colors.text.tertiary, fontSize: typography.size.sm }}>{Math.round((bookmark.progressPercent ?? 0) * 100)}%</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 100,
            left: 40,
            right: 40,
            alignItems: "center",
            opacity: toastOpacity,
          }}
        >
          <View
            style={{
              backgroundColor: colors.primary.deepGreen,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text style={{ color: "#FFF9EA", fontSize: typography.size.sm, fontWeight: typography.weight.semibold }}>
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
