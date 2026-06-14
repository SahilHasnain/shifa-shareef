import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Modal, Pressable, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
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

const EPUB_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
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
          loadEpub(message.base64, message.cfi, message.progressPercent, message.theme, message.cachedLocations);
        } else if (message.type === 'SET_THEME') {
          if (rendition) {
            if (message.theme.isDark) {
              rendition.themes.default({
                'body': { 'background': message.theme.background + ' !important', 'color': message.theme.text + ' !important' },
                '*': { 'color': message.theme.text + ' !important' }
              });
            } else {
              rendition.themes.default({ 'body': { 'background': message.theme.background + ' !important', 'color': message.theme.text + ' !important' } });
            }
            document.body.style.background = message.theme.background;
          }
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

    function loadEpub(base64Data, startCfi, startProgressPercent, theme, cachedLocations) {
      try {
        const binary = atob(base64Data);
        const len = binary.length;
        const buffer = new ArrayBuffer(len);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < len; i++) {
          view[i] = binary.charCodeAt(i);
        }

        book = ePub(buffer);

        book.ready.then(function() {
          rendition = book.renderTo('viewer', {
            width: '100%',
            height: '100%',
            flow: 'scrolled',
            manager: 'continuous'
          });

          if (theme) {
            rendition.themes.default({
              'body': { 'background': theme.background + ' !important', 'color': theme.text + ' !important' },
              '*': { 'color': theme.text + ' !important' }
            });
          }

          rendition.themes.fontSize('16px');

          // Restore cached locations to skip expensive generate()
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

          var clickHandler = function(e) {
            if (typeof window.ReactNativeWebView !== 'undefined') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOGGLE_CONTROLS' }));
            }
          };
          document.addEventListener('click', clickHandler);
          var checkIframe = setInterval(function() {
            var iframe = document.querySelector('iframe');
            if (iframe && iframe.contentDocument) {
              iframe.contentDocument.addEventListener('click', clickHandler);
              clearInterval(checkIframe);
            }
          }, 100);

          // Generate locations in background only if not cached, then save them
          if (!cachedLocations) {
            book.locations.generate(1600).then(function() {
              var serialized = book.locations.save();
              if (typeof window.ReactNativeWebView !== 'undefined') {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATIONS_GENERATED', locations: serialized }));
              }
            });
          }
        }).catch(function(err) {
          if (typeof window.ReactNativeWebView !== 'undefined') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
          }
        });
      } catch (err) {
        if (typeof window.ReactNativeWebView !== 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
        }
      }
    }
  </script>
</body>
</html>
`;

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
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
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

        const [base64] = await Promise.all([
          FileSystem.readAsStringAsync(epubUri, { encoding: FileSystem.EncodingType.Base64 }),
        ]);

        setCachedLocations(storedLocations);
        setEpubBase64(base64);
      } catch (err: any) {
        setError("Failed to load EPUB: " + err.message);
      }
    }

    loadBundledEpub();
  }, [epubUrl]);

  useEffect(() => {
    if (!epubBase64) return;

    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "LOAD_EPUB",
        base64: epubBase64,
        cfi: initialCfi,
        progressPercent: initialProgressPercent,
        cachedLocations,
        theme: themeColors,
      }),
    );
  }, [epubBase64, initialCfi, initialProgressPercent, cachedLocations, themeColors]);

  useEffect(() => {
    if (!epubBase64) return;
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "SET_THEME", theme: READER_THEME_COLORS[readerTheme] }),
    );
  }, [readerTheme, epubBase64]);

  useEffect(() => {
    if (epubBase64) {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "SET_FONT_SIZE",
          size: fontSize,
        }),
      );
    }
  }, [fontSize, epubBase64]);

  useEffect(() => {
    sessionMinProgress.current = Math.min(sessionMinProgress.current, currentProgress);
    sessionMaxProgress.current = Math.max(sessionMaxProgress.current, currentProgress);
  }, [currentProgress]);

  useEffect(() => {
    // Set immersive mode based on controls visibility
    StatusBar.setHidden(!controlsVisible, 'fade');

    // Cleanup: restore status bar when component unmounts
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [controlsVisible]);

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
      if (message.type === "READY") {
        // Request TOC after book is ready
        webViewRef.current?.postMessage(JSON.stringify({ type: "GET_TOC" }));
        // Set initial font size
        webViewRef.current?.postMessage(JSON.stringify({ type: "SET_FONT_SIZE", size: fontSize }));
      } else if (message.type === "LOCATION_CHANGED") {
        setCurrentProgress(message.progress);
        setCurrentCfi(message.cfi);
        onProgressChange(message.cfi, message.progress);
      } else if (message.type === "TOGGLE_CONTROLS") {
        setControlsVisible(prev => !prev);
      } else if (message.type === "LOCATIONS_GENERATED") {
        const filename = epubUrl.split('/').pop() || 'book.epub';
        void AsyncStorage.setItem(`shifa-shareef:epub-locations-${filename}`, message.locations);
        setCachedLocations(message.locations);
      } else if (message.type === "TOC_DATA") {
        setToc(message.toc);
      } else if (message.type === "ERROR") {
        setError(message.message);
      }
    } catch (err) { }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {controlsVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.overlay.dark, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, zIndex: 10 }}>
          <Pressable onPress={handleBack} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="chevron-back" size={24} color={colors.text.onPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold }}>{BOOK_TITLE}</Text>
            <Text style={{ color: colors.text.light, fontSize: typography.size.base, fontWeight: typography.weight.semibold }}>
              {showVolumeLabel ? `${language.title} • ${volumeDisplayTitle}` : language.title}
            </Text>
          </View>
          <Pressable onPress={() => setControlsVisible(false)} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="eye-off-outline" size={22} color={colors.text.onPrimary} />
          </Pressable>
          <Pressable
            onPress={() => {
              const next = readerTheme === "light" ? "sepia" : readerTheme === "sepia" ? "dark" : "light";
              void setReaderTheme(next);
            }}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons
              name={readerTheme === "dark" ? "moon" : readerTheme === "sepia" ? "cafe" : "sunny"}
              size={20}
              color={colors.text.onPrimary}
            />
          </Pressable>
          <Pressable onPress={() => setTocVisible(true)} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="list" size={22} color={colors.text.onPrimary} />
          </Pressable>
        </View>
      )}

      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 8 }}>Failed to load EPUB</Text>
          <Text style={{ color: colors.text.tertiary, fontSize: typography.size.base, textAlign: "center" }}>{error}</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: EPUB_HTML }}
          onMessage={handleMessage}
          style={{ flex: 1, backgroundColor: themeColors.background }}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          originWhitelist={['*']}
        />
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
