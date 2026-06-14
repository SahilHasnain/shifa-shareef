import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SystemUI from "expo-system-ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, Pressable, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { SessionCompletionModal } from "../SessionCompletionModal";
import { typography } from "../../constants/theme";
import { BOOK_TITLE } from "../../data/book";
import type { Language, Volume } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReaderTheme, READER_THEME_COLORS } from "../../hooks/useReaderTheme";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingSessions } from "../../hooks/useReadingSessions";
import { getBookmarkDisplayLabel } from "../../lib/bookmark-resolver";
import {
  getCurrentPlanDay,
  getPlanItemForDay,
  isPlanDayComplete,
} from "../../lib/plan-resolver";
import { getCurrentSection } from "../../lib/section-resolver";

type EpubReaderProps = {
  language: Language;
  volume: Volume;
  volumeDisplayTitle: string;
  showVolumeLabel: boolean;
  epubUrl: string;
  initialCfi?: string;
  initialProgressPercent?: number;
  onProgressChange: (cfi: string, progress: number) => void;
};

function escapeScriptContent(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

function buildEpubHtml(jszipSource: string, epubJsSource: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script>${escapeScriptContent(jszipSource)}</script>
  <script>${escapeScriptContent(epubJsSource)}</script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; background: #FFF9F0; }
    #viewer { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <script>
    let book = null;
    let rendition = null;

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
      try {
        const data = typeof event.data === 'string' ? event.data : event;
        if (!data || typeof data !== 'string' || (!data.startsWith('{') && !data.startsWith('['))) return;
        
        const message = JSON.parse(data);
        
        if (message.type === 'LOAD_EPUB') {
          loadEpub(message.fileUri, message.base64, message.cfi, message.progressPercent, message.theme, message.cachedLocations);
        } else if (message.type === 'SET_THEME') {
          applyTheme(message.theme);
        } else if (message.type === 'SET_FONT_SIZE') {
            if (rendition) {
            try {
              var iframe = document.querySelector('iframe');
              if (iframe && iframe.contentDocument) {
                var style = iframe.contentDocument.getElementById('dynamic-font-size');
                if (!style) {
                  style = iframe.contentDocument.createElement('style');
                  style.id = 'dynamic-font-size';
                  iframe.contentDocument.head.appendChild(style);
                }
                style.textContent = 'body, p, div, span { font-size: ' + message.size + 'px !important; }';
              } else {
                rendition.themes.fontSize(message.size + 'px');
              }
            } catch (err) {}
          }
        } else if (message.type === 'GET_TOC') {
          if (book && book.navigation) {
            var tocData = book.navigation.toc.map(function(item) {
              return { label: item.label, href: item.href };
            });
            if (typeof window.ReactNativeWebView !== 'undefined') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'TOC_DATA', 
                toc: tocData 
              }));
            }
          }
        } else if (message.type === 'JUMP_TO_HREF') {
          if (rendition && book) {
            var href = message.href;
            if (href.startsWith('/')) href = href.substring(1);
            rendition.display(href).catch(function() {});
          }
        } else if (message.type === 'GO_TO_CFI') {
          if (rendition && message.cfi) {
            rendition.display(message.cfi).catch(function(err) {
              if (typeof window.ReactNativeWebView !== 'undefined') {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'CFI navigation failed: ' + err.message }));
              }
            });
          }
        } else if (message.type === 'GO_TO_PERCENT') {
          if (rendition && book && book.locations && typeof message.progress === 'number') {
            var targetCfi = book.locations.cfiFromPercentage(message.progress);
            if (targetCfi) {
              rendition.display(targetCfi).catch(function(err) {
                if (typeof window.ReactNativeWebView !== 'undefined') {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Percent navigation failed: ' + err.message }));
                }
              });
            }
          }
        }
      } catch (err) {}
    }

    function notifyToggleControls() {
      if (typeof window.ReactNativeWebView === 'undefined') return;
      var now = Date.now();
      if (now - window.__lastToggleAt < 350) return;
      window.__lastToggleAt = now;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOGGLE_CONTROLS' }));
    }

    function bindTapToggle(target) {
      if (!target || target.__tapToggleBound) return;
      target.__tapToggleBound = true;

      var touchStartX = 0;
      var touchStartY = 0;
      var touchStartTime = 0;

      target.addEventListener('touchstart', function(e) {
        if (!e.touches || e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      target.addEventListener('touchend', function(e) {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        var dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
        var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        var dt = Date.now() - touchStartTime;
        if (dx < 14 && dy < 14 && dt < 400) {
          notifyToggleControls();
        }
      }, { passive: true });

      target.addEventListener('click', function() {
        notifyToggleControls();
      });
    }

    function bindIframeDocument(iframe) {
      if (!iframe || iframe.__tapToggleBound) return;
      iframe.__tapToggleBound = true;
      iframe.addEventListener('load', function() {
        try {
          if (iframe.contentDocument) {
            bindTapToggle(iframe.contentDocument);
            bindTapToggle(iframe.contentDocument.body);
          }
        } catch (err) {}
      });
      try {
        if (iframe.contentDocument) {
          bindTapToggle(iframe.contentDocument);
          bindTapToggle(iframe.contentDocument.body);
        }
      } catch (err) {}
    }

    function installTapToggleHandlers() {
      window.__lastToggleAt = 0;
      bindTapToggle(document);
      bindTapToggle(document.body);
      bindTapToggle(document.getElementById('viewer'));

      if (!rendition) return;

      rendition.hooks.content.register(function(contents) {
        bindTapToggle(contents.document);
        bindTapToggle(contents.document.body);
      });

      rendition.on('click', function() {
        notifyToggleControls();
      });

      document.querySelectorAll('iframe').forEach(bindIframeDocument);

      var viewer = document.getElementById('viewer');
      if (viewer && !viewer.__tapObserverBound) {
        viewer.__tapObserverBound = true;
        var observer = new MutationObserver(function() {
          document.querySelectorAll('iframe').forEach(bindIframeDocument);
        });
        observer.observe(viewer, { childList: true, subtree: true });
      }
    }

    function applyTheme(theme) {
      if (!theme) return;
      document.body.style.background = theme.background;
      if (!rendition) return;
      rendition.themes.override('color', theme.text);
      rendition.themes.override('background', theme.background);
      rendition.themes.default({
        'body': {
          'background': theme.background + ' !important',
          'color': theme.text + ' !important'
        },
        'p, div, span, li, h1, h2, h3, h4, h5, h6': {
          'color': theme.text + ' !important'
        }
      });
    }

    function openBook(buffer, startCfi, startProgressPercent, theme, cachedLocations) {
      book = ePub(buffer);

      return book.ready.then(function() {
          rendition = book.renderTo('viewer', {
            width: '100%',
            height: '100%',
            flow: 'scrolled',
            manager: 'continuous'
          });

          if (theme) {
            applyTheme(theme);
          }

          rendition.themes.fontSize('16px');

          if (cachedLocations) {
            book.locations.load(cachedLocations);
          }

          var displayTarget;
          if (startCfi) {
            displayTarget = startCfi;
          } else if (typeof startProgressPercent === 'number' && startProgressPercent > 0 && cachedLocations) {
            displayTarget = book.locations.cfiFromPercentage(startProgressPercent) || undefined;
          }

          return rendition.display(displayTarget);
        }).then(function() {
          if (typeof window.ReactNativeWebView !== 'undefined') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
          }

          rendition.on('relocated', function(location) {
            const progress = book.locations.percentageFromCfi(location.start.cfi);
            if (typeof window.ReactNativeWebView !== 'undefined') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'LOCATION_CHANGED', 
                cfi: location.start.cfi,
                progress: progress || 0
              }));
            }
          });

          installTapToggleHandlers();

          if (!cachedLocations) {
            book.locations.generate(1600).then(function() {
              var serialized = book.locations.save();
              if (typeof window.ReactNativeWebView !== 'undefined') {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATIONS_GENERATED', locations: serialized }));
              }
            });
          }
        });
    }

    function bufferFromBase64(base64Data) {
      const binary = atob(base64Data);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
      }
      return buffer;
    }

    function loadEpub(fileUri, base64Data, startCfi, startProgressPercent, theme, cachedLocations) {
      function fail(err) {
        if (typeof window.ReactNativeWebView !== 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err && err.message ? err.message : String(err) }));
        }
      }

      function startWithBuffer(buffer) {
        openBook(buffer, startCfi, startProgressPercent, theme, cachedLocations).catch(fail);
      }

      try {
        if (fileUri) {
          fetch(fileUri)
            .then(function(response) {
              if (!response.ok) {
                throw new Error('Could not read EPUB file');
              }
              return response.arrayBuffer();
            })
            .then(startWithBuffer)
            .catch(function() {
              if (base64Data) {
                startWithBuffer(bufferFromBase64(base64Data));
                return;
              }
              fail(new Error('FETCH_FAILED'));
            });
          return;
        }

        if (base64Data) {
          startWithBuffer(bufferFromBase64(base64Data));
          return;
        }

        fail(new Error('No EPUB data provided'));
      } catch (err) {
        fail(err);
      }
    }

    window.handleMessage = handleMessage;

    if (typeof ePub !== 'undefined') {
      if (typeof window.ReactNativeWebView !== 'undefined') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRIPTS_READY' }));
      }
    } else if (typeof window.ReactNativeWebView !== 'undefined') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Reader scripts failed to load' }));
    }
  </script>
</body>
</html>
`;
}

export function EpubReader({
  language,
  volume,
  volumeDisplayTitle,
  showVolumeLabel,
  epubUrl,
  initialCfi,
  initialProgressPercent,
  onProgressChange,
}: EpubReaderProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { readerTheme, setReaderTheme } = useReaderTheme();
  const themeColors = READER_THEME_COLORS[readerTheme];
  const webViewRef = useRef<WebView>(null);
  const epubLoadedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readerHtml, setReaderHtml] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [bookReady, setBookReady] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [epubFileUri, setEpubFileUri] = useState<string | null>(null);
  const [epubBase64, setEpubBase64] = useState<string | null>(null);
  const [cachedLocations, setCachedLocations] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [tocVisible, setTocVisible] = useState(false);
  const [toc, setToc] = useState<Array<{ label: string; href: string }>>([]);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [currentCfi, setCurrentCfi] = useState<string>("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    pagesRead: number;
    durationMinutes: number;
    currentStreak: number;
    isNewStreak: boolean;
    sectionsCompleted?: number;
  } | null>(null);
  const {
    isBookmarked,
    addBookmark,
    removeBookmark,
    bookmarks,
    getBookmarkForLocation,
  } = useBookmarks(volume.id, language.id);
  const { activePlan, completePlanDay } = useReadingPlan(volume.id, language.id);
  const { addSession, getCurrentStreak } = useReadingSessions();

  const sessionStartTime = useRef(Date.now());
  const sessionMinProgress = useRef(0);
  const sessionMaxProgress = useRef(0);
  const sessionStartProgress = useRef<number | null>(null);
  const sessionCompletedRef = useRef(false);

  const estimatedPage = Math.max(1, Math.round(currentProgress * volume.totalPages) || 1);
  const locationIsBookmarked = isBookmarked(
    estimatedPage,
    currentCfi || undefined,
    currentProgress,
  );
  const currentSection = getCurrentSection(volume, {
    format: "epub",
    progressPercent: currentProgress,
    lastCfi: currentCfi,
  }) ?? volume.sections[0];

  useEffect(() => {
    let cancelled = false;

    async function prepareReader() {
      try {
        const [jszipAsset, epubJsAsset] = await Promise.all([
          Asset.fromModule(require("../../assets/epub-reader/jszip.bundle")).downloadAsync(),
          Asset.fromModule(require("../../assets/epub-reader/epub.bundle")).downloadAsync(),
        ]);

        if (cancelled) return;

        const jszipUri = jszipAsset.localUri ?? jszipAsset.uri;
        const epubJsUri = epubJsAsset.localUri ?? epubJsAsset.uri;
        const [jszipSource, epubJsSource] = await Promise.all([
          FileSystem.readAsStringAsync(jszipUri),
          FileSystem.readAsStringAsync(epubJsUri),
        ]);

        if (cancelled) return;

        setReaderHtml(buildEpubHtml(jszipSource, epubJsSource));
      } catch (err: any) {
        if (!cancelled) {
          setError("Failed to prepare reader: " + err.message);
          setIsLoading(false);
        }
      }
    }

    void prepareReader();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function loadBundledEpub() {
      try {
        const filename = epubUrl.split('/').pop() || 'book.epub';
        const epubUri = FileSystem.documentDirectory + filename;
        const locationsKey = `shifa-shareef:epub-locations-${filename}`;

        const [fileInfo, storedLocations] = await Promise.all([
          FileSystem.getInfoAsync(epubUri),
          AsyncStorage.getItem(locationsKey).catch(() => null),
        ]);

        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(epubUrl, epubUri);
        }

        setCachedLocations(storedLocations);
        setEpubFileUri(epubUri);
      } catch (err: any) {
        setError("Failed to load EPUB: " + err.message);
        setIsLoading(false);
      }
    }

    void loadBundledEpub();
  }, [epubUrl]);

  const sendLoadEpub = useCallback(() => {
    if (!epubFileUri || !webViewReady || epubLoadedRef.current) return;

    epubLoadedRef.current = true;
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "LOAD_EPUB",
        fileUri: epubFileUri,
        base64: epubBase64,
        cfi: initialCfi,
        progressPercent: initialProgressPercent,
        cachedLocations,
        theme: READER_THEME_COLORS[readerTheme],
      }),
    );
  }, [epubFileUri, epubBase64, webViewReady, initialCfi, initialProgressPercent, cachedLocations, readerTheme]);

  const retryWithBase64 = useCallback(async () => {
    if (!epubFileUri || epubBase64) {
      return;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(epubFileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setEpubBase64(base64);
      epubLoadedRef.current = false;
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "LOAD_EPUB",
          fileUri: null,
          base64,
          cfi: initialCfi,
          progressPercent: initialProgressPercent,
          cachedLocations,
          theme: READER_THEME_COLORS[readerTheme],
        }),
      );
      epubLoadedRef.current = true;
    } catch (err: any) {
      setError("Failed to load EPUB: " + err.message);
      setIsLoading(false);
    }
  }, [
    cachedLocations,
    epubBase64,
    epubFileUri,
    initialCfi,
    initialProgressPercent,
    readerTheme,
  ]);

  useEffect(() => {
    sendLoadEpub();
  }, [sendLoadEpub]);

  useEffect(() => {
    if (!bookReady) return;
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "SET_THEME", theme: READER_THEME_COLORS[readerTheme] }),
    );
  }, [readerTheme, bookReady]);

  useEffect(() => {
    if (!bookReady) return;
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "SET_FONT_SIZE",
        size: fontSize,
      }),
    );
  }, [fontSize, bookReady]);

  useEffect(() => {
    if (!isLoading) return;

    const timeout = setTimeout(() => {
      setError("Book is taking too long to open. Please go back and try again.");
      setIsLoading(false);
    }, 90000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    sessionMinProgress.current = Math.min(sessionMinProgress.current, currentProgress);
    sessionMaxProgress.current = Math.max(sessionMaxProgress.current, currentProgress);
  }, [currentProgress]);

  useEffect(() => {
    StatusBar.setHidden(!controlsVisible, "fade");

    const systemUiColor = controlsVisible
      ? colors.surface.lightCream
      : themeColors.background;
    void SystemUI.setBackgroundColorAsync(systemUiColor).catch(() => {});

    return () => {
      StatusBar.setHidden(false, "fade");
      void SystemUI.setBackgroundColorAsync(colors.surface.lightCream).catch(() => {});
    };
  }, [controlsVisible, themeColors.background, colors.surface.lightCream]);

  const completeSession = useCallback(async () => {
    if (sessionCompletedRef.current) {
      return false;
    }

    const endTime = Date.now();
    const durationMs = endTime - sessionStartTime.current;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const progressDelta = sessionMaxProgress.current - sessionMinProgress.current;
    const pagesRead = Math.max(
      1,
      Math.round(progressDelta * volume.totalPages) || 1,
    );
    const startPage = Math.max(
      1,
      Math.round(sessionMinProgress.current * volume.totalPages) || 1,
    );
    const endPage = Math.max(
      startPage,
      Math.round(sessionMaxProgress.current * volume.totalPages) || startPage,
    );
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
        const currentDay = getCurrentPlanDay(volume, activePlan, {
          format: "epub",
          progressPercent: sessionMaxProgress.current,
        });
        const planItem = getPlanItemForDay(activePlan, currentDay);
        if (
          planItem &&
          isPlanDayComplete(volume, planItem, {
            format: "epub",
            progressPercent: sessionMaxProgress.current,
          })
        ) {
          await completePlanDay(currentDay);
        }
      }

      if (shouldShowModal) {
        const newStreak = getCurrentStreak();
        const sectionsCompleted = volume.sections.filter((section) => {
          const end =
            section.endProgressPercent ?? section.endPage / volume.totalPages;
          return sessionStartProgress.current != null
            ? sessionStartProgress.current <= end &&
                sessionMaxProgress.current > end
            : false;
        }).length;

        setCompletionData({
          pagesRead,
          durationMinutes,
          currentStreak: newStreak,
          isNewStreak: newStreak > previousStreak,
          sectionsCompleted,
        });
        setShowCompletionModal(true);
        return true;
      }
    }

    return false;
  }, [
    activePlan,
    addSession,
    completePlanDay,
    getCurrentStreak,
    language.id,
    volume,
  ]);

  useEffect(() => {
    if (sessionStartProgress.current == null && currentProgress > 0) {
      sessionStartProgress.current = currentProgress;
    }
  }, [currentProgress]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showCompletionModal) {
        setShowCompletionModal(false);
        return true;
      }

      void completeSession().then((showingModal) => {
        if (!showingModal) {
          router.back();
        }
      });
      return true;
    });

    return () => backHandler.remove();
  }, [completeSession, router, showCompletionModal]);

  const handleBack = () => {
    void completeSession().then((showingModal) => {
      if (!showingModal) {
        router.back();
      }
    });
  };

  const toggleBookmark = async () => {
    if (locationIsBookmarked) {
      const bookmarkData = getBookmarkForLocation(
        currentCfi || undefined,
        currentProgress,
      );
      if (bookmarkData) {
        await removeBookmark(bookmarkData.id);
      }
    } else {
      await addBookmark(estimatedPage, {
        cfi: currentCfi || undefined,
        progressPercent: currentProgress,
        label: currentSection.title,
      });
    }
  };

  const jumpToBookmark = (bookmark: (typeof bookmarks)[number]) => {
    if (bookmark.cfi) {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: "GO_TO_CFI", cfi: bookmark.cfi }),
      );
    } else if (bookmark.progressPercent != null) {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "GO_TO_PERCENT",
          progress: bookmark.progressPercent,
        }),
      );
    }
    setBookmarksVisible(false);
  };

  const handleMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (!data || typeof data !== 'string' || (!data.startsWith('{') && !data.startsWith('['))) return;

      const message = JSON.parse(data);
      if (message.type === "SCRIPTS_READY") {
        setWebViewReady(true);
      } else if (message.type === "READY") {
        setBookReady(true);
        setIsLoading(false);
        // Request TOC after book is ready
        webViewRef.current?.postMessage(JSON.stringify({ type: "GET_TOC" }));
        // Set initial font size
        webViewRef.current?.postMessage(JSON.stringify({ type: "SET_FONT_SIZE", size: fontSize }));
      } else if (message.type === "LOCATION_CHANGED") {
        setCurrentProgress(message.progress);
        setCurrentCfi(message.cfi);
        onProgressChange(message.cfi, message.progress);
      } else if (message.type === "TOGGLE_CONTROLS") {
        setControlsVisible(true);
      } else if (message.type === "LOCATIONS_GENERATED") {
        const filename = epubUrl.split('/').pop() || 'book.epub';
        void AsyncStorage.setItem(`shifa-shareef:epub-locations-${filename}`, message.locations);
        setCachedLocations(message.locations);
      } else if (message.type === "TOC_DATA") {
        setToc(message.toc);
      } else if (message.type === "ERROR") {
        if (
          (message.message === "FETCH_FAILED" || message.message === "Could not open EPUB file") &&
          !epubBase64
        ) {
          void retryWithBase64();
          return;
        }
        setError(message.message);
        setIsLoading(false);
      }
    } catch (err) { }
  };

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
          <Pressable
            onPress={() => {
              const next = readerTheme === "light" ? "sepia" : readerTheme === "sepia" ? "dark" : "light";
              void setReaderTheme(next);
            }}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons
              name={readerTheme === "dark" ? "moon" : readerTheme === "sepia" ? "cafe" : "sunny"}
              size={20}
              color={colors.text.onPrimary}
            />
          </Pressable>
          <Pressable onPress={() => setTocVisible(true)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="list" size={22} color={colors.text.onPrimary} />
          </Pressable>
        </View>
      )}

      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 8 }}>Failed to load EPUB</Text>
          <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, textAlign: "center" }}>{error}</Text>
        </View>
      ) : readerHtml ? (
        <>
          <WebView
            ref={webViewRef}
            source={{ html: readerHtml }}
            onMessage={handleMessage}
            onLoadEnd={() => {
              webViewRef.current?.injectJavaScript(`
                if (typeof ePub !== 'undefined' && window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRIPTS_READY' }));
                }
                true;
              `);
            }}
            style={{ flex: 1, backgroundColor: themeColors.background }}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            originWhitelist={['*']}
            allowingReadAccessToURL={FileSystem.documentDirectory ?? undefined}
          />
          {isLoading && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: themeColors.background }}>
              <ActivityIndicator size="large" color={colors.primary.sageGreen} />
              <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, marginTop: 12 }}>Loading book...</Text>
            </View>
          )}
        </>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: themeColors.background }}>
          <ActivityIndicator size="large" color={colors.primary.sageGreen} />
        </View>
      )}

      {controlsVisible && (
        <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay.dark }}>
          <View style={{ paddingTop: 20, paddingBottom: 20, paddingHorizontal: 20, gap: 20 }}>
            {/* Progress Bar */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.base, fontWeight: typography.weight.semibold, minWidth: 50 }}>
                {Math.round(currentProgress * 100)}%
              </Text>
              <View style={{ flex: 1, height: 8, backgroundColor: colors.overlay.light, borderRadius: 4, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.round(currentProgress * 100)}%`, backgroundColor: colors.secondary.lightGold, borderRadius: 4 }} />
              </View>
            </View>

            {/* Font Size Controls */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={() => setFontSize(prev => Math.max(12, prev - 2))}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.overlay.light,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.text.onPrimary, fontSize: 18, fontWeight: typography.weight.bold }}>A-</Text>
                </Pressable>

                <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.sm, minWidth: 50, textAlign: "center" }}>
                  {fontSize}px
                </Text>

                <Pressable
                  onPress={() => setFontSize(prev => Math.min(40, prev + 2))}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.overlay.light,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.text.onPrimary, fontSize: 20, fontWeight: typography.weight.bold }}>A+</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={toggleBookmark}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.overlay.light,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons
                    name={locationIsBookmarked ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={colors.text.onPrimary}
                  />
                </Pressable>

                <Pressable
                  onPress={() => setBookmarksVisible(true)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.overlay.light,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="bookmarks" size={20} color={colors.text.onPrimary} />
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Table of Contents Modal */}
      <Modal
        visible={tocVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTocVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface.warmIvory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface.creamyWhite }}>
              <Text style={{ fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary }}>Table of Contents</Text>
              <Pressable onPress={() => setTocVisible(false)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 500 }}>
              {toc.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base }}>No chapters available</Text>
                </View>
              ) : (
                toc.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      webViewRef.current?.postMessage(JSON.stringify({ type: 'JUMP_TO_HREF', href: item.href }));
                      setTocVisible(false);
                    }}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.surface.creamyWhite }}
                  >
                    <Text style={{ fontSize: typography.size.base, color: colors.text.primary }}>{item.label}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal
        visible={bookmarksVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBookmarksVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface.warmIvory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface.creamyWhite }}>
              <Text style={{ fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary }}>Bookmarks ({bookmarks.length})</Text>
              <Pressable onPress={() => setBookmarksVisible(false)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 500 }}>
              {bookmarks.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="bookmark-outline" size={48} color={colors.text.tertiary} />
                  <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, marginTop: 12 }}>No bookmarks yet</Text>
                  <Text style={{ color: colors.text.subtle, fontSize: typography.size.sm, marginTop: 4, textAlign: 'center' }}>Tap the bookmark icon while reading to save your place</Text>
                </View>
              ) : (
                bookmarks.map((bookmark) => (
                  <TouchableOpacity
                    key={bookmark.id}
                    onPress={() => jumpToBookmark(bookmark)}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.surface.creamyWhite, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <Ionicons name="bookmark" size={20} color={colors.primary.sageGreen} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                        {getBookmarkDisplayLabel(volume, bookmark)}
                      </Text>
                      {bookmark.label ? (
                        <Text style={{ fontSize: typography.size.sm, color: colors.text.tertiary, marginTop: 2 }}>
                          {bookmark.label}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: typography.size.sm, color: colors.text.tertiary, marginTop: 4 }}>{new Date(bookmark.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Pressable
                      onPress={async () => {
                        await removeBookmark(bookmark.id);
                      }}
                      style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.7 : 1 })}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.text.tertiary} />
                    </Pressable>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showCompletionModal && completionData && (
        <SessionCompletionModal
          visible={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            setCompletionData(null);
          }}
          onContinue={() => {
            setShowCompletionModal(false);
            setCompletionData(null);
          }}
          onGoHome={() => {
            setShowCompletionModal(false);
            setCompletionData(null);
            router.replace("/(tabs)/" as any);
          }}
          pagesRead={completionData.pagesRead}
          durationMinutes={completionData.durationMinutes}
          currentStreak={completionData.currentStreak}
          isNewStreak={completionData.isNewStreak}
          sectionsCompleted={completionData.sectionsCompleted}
        />
      )}
    </View>
  );
}
