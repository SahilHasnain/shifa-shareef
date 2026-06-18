import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SystemUI from "expo-system-ui";
import { WebView } from "react-native-webview";

import { BOOK_TITLE } from "../../data/book";
import type { Language, Volume } from "../../data/types";
import { typography } from "../../constants/theme";
import { useAppTheme } from "../../hooks/useAppTheme";
import { READER_THEME_COLORS, useReaderTheme } from "../../hooks/useReaderTheme";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingSessions } from "../../hooks/useReadingSessions";
import { getCurrentPlanDay, getPlanItemForDay, isPlanDayComplete } from "../../lib/plan-resolver";
import { getCurrentSection } from "../../lib/section-resolver";

type ChapterManifest = {
  title?: string;
  chapters: ChapterManifestItem[];
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

function buildChapterHtml(chapters: LoadedChapter[], baseUrl: string, theme: (typeof READER_THEME_COLORS)[keyof typeof READER_THEME_COLORS], fontSize: number): string {
  const chapterSections = chapters
    .map((chapter) => `<section class="reader-chapter" data-chapter-index="${chapter.index}">${chapter.html}</section>`)
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <base href="${baseUrl}">
  <style>
    html, body { min-height: 100%; margin: 0; padding: 0; background: ${theme.background}; color: ${theme.text}; }
    body { font-size: ${fontSize}px; line-height: 1.75; padding: 28px 22px 42px; overflow-x: hidden; }
    body, p, div, span, li { color: ${theme.text} !important; }
    p { margin: 0 0 1em; }
    img, svg { max-width: 100%; height: auto; }
    a { color: #C9A961; }
    .reader-chapter { min-height: 70vh; padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid rgba(201, 169, 97, 0.18); }
    .reader-chapter:last-child { border-bottom: 0; }
    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; -ms-overflow-style: none; box-sizing: border-box; }
  </style>
</head>
<body>
  <main id="reader-root">${chapterSections}</main>
  <script>
    var lastSentAt = 0;
    var restored = false;
    var requestedNextAfter = null;

    function getSections() {
      return Array.prototype.slice.call(document.querySelectorAll('.reader-chapter'));
    }

    function getActiveSection() {
      var sections = getSections();
      if (sections.length === 0) return null;
      var probeY = window.scrollY + Math.max(80, window.innerHeight * 0.28);
      var active = sections[0];
      for (var i = 0; i < sections.length; i++) {
        var section = sections[i];
        if (section.offsetTop <= probeY) active = section;
      }
      return active;
    }

    function getChapterProgress(section) {
      if (!section) return 0;
      var sectionTop = section.offsetTop;
      var maxScroll = Math.max(1, section.offsetHeight - window.innerHeight);
      return Math.min(1, Math.max(0, (window.scrollY - sectionTop) / maxScroll));
    }

    function maybeRequestNext() {
      var sections = getSections();
      var last = sections[sections.length - 1];
      if (!last) return;
      var afterIndex = Number(last.getAttribute('data-chapter-index'));
      var distanceFromBottom = last.offsetTop + last.offsetHeight - (window.scrollY + window.innerHeight);
      if (distanceFromBottom < 900 && requestedNextAfter !== afterIndex) {
        requestedNextAfter = afterIndex;
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NEED_NEXT', afterIndex: afterIndex }));
      }
    }

    function sendProgress(force) {
      var now = Date.now();
      if (!force && now - lastSentAt < 500) return;
      lastSentAt = now;
      var active = getActiveSection();
      var chapterIndex = active ? Number(active.getAttribute('data-chapter-index')) : 0;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PROGRESS', chapterIndex: chapterIndex, chapterProgress: getChapterProgress(active) }));
      maybeRequestNext();
    }

    function restoreProgress(chapterIndex, progress) {
      if (restored) return;
      restored = true;
      requestAnimationFrame(function() {
        var section = document.querySelector('.reader-chapter[data-chapter-index="' + chapterIndex + '"]') || getActiveSection();
        var maxScroll = section ? Math.max(0, section.offsetHeight - window.innerHeight) : 0;
        var sectionTop = section ? section.offsetTop : 0;
        window.scrollTo(0, sectionTop + maxScroll * Math.min(1, Math.max(0, progress || 0)));
        setTimeout(function() {
          sendProgress(true);
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
        }, 80);
      });
    }

    document.addEventListener('message', function(event) {
      try {
        var message = JSON.parse(event.data);
        if (message.type === 'RESTORE') restoreProgress(message.chapterIndex, message.chapterProgress);
      } catch (err) {}
    });
    window.addEventListener('message', function(event) {
      try {
        var message = JSON.parse(event.data);
        if (message.type === 'RESTORE') restoreProgress(message.chapterIndex, message.chapterProgress);
      } catch (err) {}
    });
    window.__appendChapter = function(chapterIndex, html) {
      if (document.querySelector('.reader-chapter[data-chapter-index="' + chapterIndex + '"]')) return;
      var section = document.createElement('section');
      section.className = 'reader-chapter';
      section.setAttribute('data-chapter-index', String(chapterIndex));
      section.innerHTML = html;
      document.getElementById('reader-root').appendChild(section);
      requestedNextAfter = null;
      setTimeout(function() { sendProgress(true); }, 80);
    };
    window.addEventListener('scroll', function() { sendProgress(false); }, { passive: true });
    window.addEventListener('load', function() { restoreProgress(${chapters[0]?.index ?? 0}, 0); });
    setTimeout(function() { restoreProgress(${chapters[0]?.index ?? 0}, 0); }, 250);
    document.body.addEventListener('click', function() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOGGLE_CONTROLS' }));
    });
  </script>
</body>
</html>`;
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

  const [manifest, setManifest] = useState<ChapterManifest | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([]);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [tocVisible, setTocVisible] = useState(false);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    pagesRead: number;
    durationMinutes: number;
    currentStreak: number;
    isNewStreak: boolean;
    sectionsCompleted?: number;
  } | null>(null);

  const currentChapter = manifest?.chapters[chapterIndex] ?? null;
  const currentSection = getCurrentSection(volume, {
    progressPercent: currentProgress,
    lastCfi: makeLocator(chapterIndex, chapterProgress),
  }) ?? volume.sections[0];
  const estimatedPage = Math.max(1, Math.round(currentProgress * volume.totalPages) || 1);
  const { isBookmarked, addBookmark, removeBookmark, bookmarks, getBookmarkForLocation } = useBookmarks(volume.id, language.id);
  const { activePlan, completePlanDay } = useReadingPlan(volume.id, language.id);
  const { addSession, getCurrentStreak } = useReadingSessions();
  const locationIsBookmarked = isBookmarked(estimatedPage, makeLocator(chapterIndex, chapterProgress), currentProgress);

  const readerHtml = useMemo(() => {
    if (loadedChapters.length === 0) return null;
    return buildChapterHtml(loadedChapters, `${assetBaseUrl}/`, themeColors, fontSize);
  }, [assetBaseUrl, fontSize, loadedChapters, themeColors]);

  const calculateGlobalProgress = useCallback((index: number, progressWithinChapter: number) => {
    if (!manifest) return 0;
    const chapter = manifest.chapters[index];
    if (!chapter) return 0;
    const range = getChapterProgressRange(chapter, index, manifest.chapters.length);
    return Math.min(1, Math.max(0, range.start + (range.end - range.start) * progressWithinChapter));
  }, [manifest]);

  const getChapterHtml = useCallback(async (index: number) => {
    if (!manifest) return null;
    const chapter = manifest.chapters[index];
    if (!chapter) return null;

    const chapterUrl = resolveChapterUrl(assetBaseUrl, chapter.href);
    const cached = chapterCacheRef.current.get(chapterUrl);
    if (cached) {
      return cached;
    }

    const response = await fetch(chapterUrl);
    if (!response.ok) throw new Error(`Failed to load chapter ${index + 1}`);
    const html = extractReadableContent(await response.text());
    chapterCacheRef.current.set(chapterUrl, html);
    return html;
  }, [assetBaseUrl, manifest]);

  const prefetchChapter = useCallback(async (index: number) => {
    if (!manifest || index < 0 || index >= manifest.chapters.length) return;
    const chapterUrl = resolveChapterUrl(assetBaseUrl, manifest.chapters[index].href);
    if (chapterCacheRef.current.has(chapterUrl)) return;

    try {
      const response = await fetch(chapterUrl);
      if (response.ok) {
        chapterCacheRef.current.set(chapterUrl, extractReadableContent(await response.text()));
      }
    } catch { }
  }, [assetBaseUrl, manifest]);

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
        setManifest(nextManifest);
        setChapterIndex(getInitialChapterIndex(nextManifest, initialLocator, initialProgressPercent));
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
            setManifest(parsed);
            setChapterIndex(getInitialChapterIndex(parsed, initialLocator, initialProgressPercent));
            return;
          } catch { }
        }

        setError(err instanceof Error ? err.message : "Failed to load chapter manifest");
        setIsLoading(false);
      }
    }

    void loadManifest();
    return () => { cancelled = true; };
  }, [initialLocator, initialProgressPercent, language.id, manifestUrl, onFallbackRequested, volume.id]);

  useEffect(() => {
    if (!manifest) return;
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadedChapters([]);
        loadedChapterIndexesRef.current = new Set<number>();
        appendInFlightRef.current = new Set<number>();

        const start = Math.max(0, chapterIndex - 1);
        const end = Math.min(manifest.chapters.length - 1, chapterIndex + 1);
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
          void prefetchChapter(chapterIndex + 2);
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
  }, [chapterIndex, getChapterHtml, manifest, prefetchChapter]);

  useEffect(() => {
    StatusBar.setHidden(!controlsVisible, "fade");
    void SystemUI.setBackgroundColorAsync(controlsVisible ? colors.surface.lightCream : themeColors.background).catch(() => { });

    return () => {
      StatusBar.setHidden(false, "fade");
      void SystemUI.setBackgroundColorAsync(colors.surface.lightCream).catch(() => { });
    };
  }, [colors.surface.lightCream, controlsVisible, themeColors.background]);

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
      const previousStreak = getCurrentStreak();

      await addSession({
        languageId: language.id,
        volumeId: volume.id,
        date: new Date().toISOString(),
        pagesRead,
        startPage,
        endPage,
        durationMinutes,
      });

      if (activePlan) {
        const currentDay = getCurrentPlanDay(volume, activePlan, { progressPercent: sessionMaxProgress.current });
        const planItem = getPlanItemForDay(activePlan, currentDay);
        if (planItem && isPlanDayComplete(volume, planItem, { progressPercent: sessionMaxProgress.current })) {
          await completePlanDay(currentDay);
        }
      }

      if (shouldShowModal) {
        const newStreak = getCurrentStreak();
        const sectionsCompleted = volume.sections.filter((section) => {
          const end = section.endProgressPercent ?? section.endPage / volume.totalPages;
          return sessionStartProgress.current != null
            ? sessionStartProgress.current <= end && sessionMaxProgress.current > end
            : false;
        }).length;

        setCompletionData({ pagesRead, durationMinutes, currentStreak: newStreak, isNewStreak: newStreak > previousStreak, sectionsCompleted });
        setShowCompletionModal(true);
        return true;
      }
    }

    return false;
  }, [activePlan, addSession, completePlanDay, getCurrentStreak, language.id, volume]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showCompletionModal) {
        setShowCompletionModal(false);
        return true;
      }

      void completeSession().then((showingModal) => {
        if (!showingModal) router.back();
      });
      return true;
    });

    return () => backHandler.remove();
  }, [completeSession, router, showCompletionModal]);

  const handleBack = () => {
    void completeSession().then((showingModal) => {
      if (!showingModal) router.back();
    });
  };

  const goToChapter = useCallback((index: number, progress = 0) => {
    if (!manifest) return;
    const nextIndex = Math.min(manifest.chapters.length - 1, Math.max(0, index));
    setChapterIndex(nextIndex);
    setChapterProgress(progress);
    setCurrentProgress(calculateGlobalProgress(nextIndex, progress));
    setTocVisible(false);
    setBookmarksVisible(false);
  }, [calculateGlobalProgress, manifest]);

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

  const handleMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (!data || typeof data !== "string" || (!data.startsWith("{") && !data.startsWith("["))) return;
      const message = JSON.parse(data);

      if (message.type === "READY") {
        setIsLoading(false);
      } else if (message.type === "PROGRESS") {
        const nextChapterProgress = typeof message.chapterProgress === "number" ? message.chapterProgress : 0;
        const nextProgress = calculateGlobalProgress(chapterIndex, nextChapterProgress);
        const locator = makeLocator(chapterIndex, nextChapterProgress);

        setChapterProgress(nextChapterProgress);
        setCurrentProgress(nextProgress);

        if (lastSavedLocatorRef.current !== locator) {
          lastSavedLocatorRef.current = locator;
          onProgressChange(locator, nextProgress);
        }
      } else if (message.type === "TOGGLE_CONTROLS") {
        setControlsVisible(true);
      }
    } catch { }
  };

  const restoreProgress = () => {
    const parsed = parseLocator(initialLocator);
    const restoreValue = parsed && parsed.chapterIndex === chapterIndex ? parsed.chapterProgress : chapterProgress;
    webViewRef.current?.postMessage(JSON.stringify({ type: "RESTORE", chapterProgress: restoreValue }));
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
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.overlay.dark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 16, zIndex: 10 }}>
          <Pressable onPress={handleBack} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="chevron-back" size={24} color={colors.text.onPrimary} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 4 }}>
            <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold }}>{BOOK_TITLE}</Text>
            <Text style={{ color: colors.text.light, fontSize: typography.size.base, fontWeight: typography.weight.semibold }}>
              {showVolumeLabel ? `${language.title} • ${volumeDisplayTitle}` : language.title}
            </Text>
          </View>
          <Pressable onPress={() => setControlsVisible(false)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="eye-off-outline" size={22} color={colors.text.onPrimary} />
          </Pressable>
          <Pressable onPress={() => { const next = readerTheme === "light" ? "sepia" : readerTheme === "sepia" ? "dark" : "light"; void setReaderTheme(next); }} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name={readerTheme === "dark" ? "moon" : readerTheme === "sepia" ? "cafe" : "sunny"} size={20} color={colors.text.onPrimary} />
          </Pressable>
          <Pressable onPress={() => setTocVisible(true)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="list" size={22} color={colors.text.onPrimary} />
          </Pressable>
        </View>
      )}

      {readerHtml ? (
        <WebView
          ref={webViewRef}
          source={{ html: readerHtml }}
          onMessage={handleMessage}
          onLoadEnd={restoreProgress}
          style={{ flex: 1, backgroundColor: themeColors.background }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
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
              <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.base, fontWeight: typography.weight.semibold, minWidth: 50 }}>{Math.round(currentProgress * 100)}%</Text>
              <View style={{ flex: 1, height: 8, backgroundColor: colors.overlay.light, borderRadius: 4, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.round(currentProgress * 100)}%`, backgroundColor: colors.secondary.lightGold, borderRadius: 4 }} />
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable disabled={chapterIndex === 0} onPress={() => goToChapter(chapterIndex - 1, 0)} style={({ pressed }) => ({ opacity: chapterIndex === 0 ? 0.35 : pressed ? 0.65 : 1 })}>
                <Ionicons name="chevron-back-circle" size={34} color={colors.text.onPrimary} />
              </Pressable>
              <Text style={{ flex: 1, color: colors.text.light, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textAlign: "center", paddingHorizontal: 12 }} numberOfLines={1}>
                {currentChapter?.title ?? `Chapter ${chapterIndex + 1}`}
              </Text>
              <Pressable disabled={chapterIndex >= manifest.chapters.length - 1} onPress={() => goToChapter(chapterIndex + 1, 0)} style={({ pressed }) => ({ opacity: chapterIndex >= manifest.chapters.length - 1 ? 0.35 : pressed ? 0.65 : 1 })}>
                <Ionicons name="chevron-forward-circle" size={34} color={colors.text.onPrimary} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable onPress={() => setFontSize(prev => Math.max(12, prev - 2))} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ color: colors.text.onPrimary, fontSize: 18, fontWeight: typography.weight.bold }}>A-</Text>
                </Pressable>
                <Pressable onPress={() => setFontSize(prev => Math.min(28, prev + 2))} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ color: colors.text.onPrimary, fontSize: 18, fontWeight: typography.weight.bold }}>A+</Text>
                </Pressable>
              </View>
              <Pressable onPress={toggleBookmark} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: locationIsBookmarked ? colors.secondary.lightGold : colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name={locationIsBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={locationIsBookmarked ? colors.primary.deepGreen : colors.text.onPrimary} />
              </Pressable>
              <Pressable onPress={() => setBookmarksVisible(true)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="bookmarks-outline" size={22} color={colors.text.onPrimary} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      )}

      <Modal visible={tocVisible} animationType="slide" transparent onRequestClose={() => setTocVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setTocVisible(false)}>
          <View style={{ maxHeight: "70%", backgroundColor: colors.surface.warmIvory, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <Text style={{ color: colors.text.primary, fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, marginBottom: 16 }}>Chapters</Text>
            {manifest?.chapters.map((chapter, index) => (
              <Pressable key={`${chapter.href}-${index}`} onPress={() => goToChapter(index, 0)} style={({ pressed }) => ({ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(23,61,49,0.08)", opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ color: index === chapterIndex ? colors.secondary.mutedGold : colors.text.primary, fontSize: typography.size.base, fontWeight: index === chapterIndex ? typography.weight.bold : typography.weight.medium }}>{chapter.title}</Text>
              </Pressable>
            ))}
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

      <Modal visible={showCompletionModal} transparent animationType="fade" onRequestClose={() => setShowCompletionModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 }} onPress={() => setShowCompletionModal(false)}>
          <View style={{ width: "100%", borderRadius: 24, backgroundColor: colors.surface.warmIvory, padding: 24, alignItems: "center", gap: 12 }}>
            <Ionicons name="checkmark-circle" size={52} color={colors.accent.success} />
            <Text style={{ color: colors.text.primary, fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, textAlign: "center" }}>Reading session saved</Text>
            {completionData ? (
              <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, textAlign: "center", lineHeight: 22 }}>
                You read about {completionData.pagesRead} pages in {completionData.durationMinutes} minutes.
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
