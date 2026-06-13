import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, Modal, ScrollView, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

import { typography } from "../../constants/theme";
import { BOOK_TITLE } from "../../data/book";
import type { Volume, Language } from "../../data/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useBookmarks } from "../../hooks/useBookmarks";

type EpubReaderProps = {
  language: Language;
  volume: Volume;
  volumeDisplayTitle: string;
  showVolumeLabel: boolean;
  epubUrl: string;
  initialCfi?: string;
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

    if (typeof window.ReactNativeWebView !== 'undefined') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Script loaded' }));
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
      try {
        const data = typeof event.data === 'string' ? event.data : event;
        if (!data || typeof data !== 'string' || (!data.startsWith('{') && !data.startsWith('['))) return;
        
        const message = JSON.parse(data);
        if (typeof window.ReactNativeWebView !== 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Received: ' + message.type }));
        }
        
        if (message.type === 'LOAD_EPUB') {
          loadEpub(message.base64, message.cfi, message.theme);
        } else if (message.type === 'SET_FONT_SIZE') {
          if (typeof window.ReactNativeWebView !== 'undefined') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Setting font size: ' + message.size + 'px, rendition exists: ' + (!!rendition) }));
          }
          if (rendition) {
            try {
              rendition.themes.fontSize(message.size + 'px');
              if (typeof window.ReactNativeWebView !== 'undefined') {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Font size applied successfully' }));
              }
            } catch (err) {
              if (typeof window.ReactNativeWebView !== 'undefined') {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Font size error: ' + err.message }));
              }
            }
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
          if (rendition) {
            rendition.display(message.href);
          }
        }
      } catch (err) {}
    }

    function loadEpub(base64Data, startCfi, theme) {
      try {
        if (typeof window.ReactNativeWebView !== 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Converting base64' }));
        }

        const binary = atob(base64Data);
        const len = binary.length;
        const buffer = new ArrayBuffer(len);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < len; i++) {
          view[i] = binary.charCodeAt(i);
        }

        book = ePub(buffer);

        book.ready.then(function() {
          if (typeof window.ReactNativeWebView !== 'undefined') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Book ready, rendering continuous scroll' }));
          }

          rendition = book.renderTo('viewer', {
            width: '100%',
            height: '100%',
            flow: 'scrolled',
            manager: 'continuous'
          });

          if (theme) {
            rendition.themes.default({
              body: { background: theme.background + ' !important', color: theme.color + ' !important' }
            });
          }

          // Set initial font size
          rendition.themes.fontSize('16px');

          return startCfi ? rendition.display(startCfi) : rendition.display();
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

          // Add tap to toggle controls
          document.addEventListener('click', function(e) {
            if (typeof window.ReactNativeWebView !== 'undefined') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOGGLE_CONTROLS' }));
            }
          });

          // Add tap to toggle controls
          document.addEventListener('click', function(e) {
            if (typeof window.ReactNativeWebView !== 'undefined') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOGGLE_CONTROLS' }));
            }
          });
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
  onProgressChange,
}: EpubReaderProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [epubBase64, setEpubBase64] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [tocVisible, setTocVisible] = useState(false);
  const [toc, setToc] = useState<Array<{ label: string; href: string }>>([]);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [currentCfi, setCurrentCfi] = useState<string>("");
  const { isBookmarked, addBookmark, removeBookmark, bookmarks } = useBookmarks(volume.id, language.id);

  useEffect(() => {
    async function loadBundledEpub() {
      try {
        console.log("[EPUB] Downloading EPUB from CDN");
        const epubUri = FileSystem.documentDirectory + "roman-urdu-volume1.epub";
        
        const fileInfo = await FileSystem.getInfoAsync(epubUri);
        if (!fileInfo.exists) {
          console.log("[EPUB] Downloading from CDN...");
          await FileSystem.downloadAsync(
            "https://cdn.jsdelivr.net/gh/SahilHasnain/shifa-shareef-assets@main/epub/roman-urdu/volume1.epub",
            epubUri
          );
          console.log("[EPUB] Download complete");
        } else {
          console.log("[EPUB] Using cached file");
        }
        
        const base64 = await FileSystem.readAsStringAsync(epubUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log("[EPUB] Base64 loaded, length:", base64.length);
        setEpubBase64(base64);
      } catch (err: any) {
        console.error("[EPUB] Failed to load:", err);
        setError("Failed to load EPUB: " + err.message);
      }
    }
    
    loadBundledEpub();
  }, []);

  useEffect(() => {
    if (!epubBase64) return;
    
    console.log("[EPUB] Sending LOAD_EPUB message");
    const timer = setTimeout(() => {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "LOAD_EPUB",
          base64: epubBase64,
          cfi: initialCfi,
          theme: { background: colors.surface.lightCream, color: colors.text.primary },
        }),
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [epubBase64, initialCfi, colors]);

  useEffect(() => {
    // Update font size when it changes
    if (epubBase64) {
      console.log("[EPUB] Changing font size to:", fontSize);
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "SET_FONT_SIZE",
          size: fontSize,
        }),
      );
    }
  }, [fontSize, epubBase64]);

  const handleMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (!data || typeof data !== 'string' || (!data.startsWith('{') && !data.startsWith('['))) return;
      
      const message = JSON.parse(data);
      if (message.type === "DEBUG") {
        console.log("[EPUB DEBUG]", message.message);
      } else if (message.type === "READY") {
        console.log("[EPUB] Ready - Continuous scroll mode active");
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
      } else if (message.type === "TOC_DATA") {
        console.log("[EPUB] TOC received:", message.toc.length, "chapters");
        setToc(message.toc);
      } else if (message.type === "ERROR") {
        console.error("[EPUB ERROR]", message.message);
        setError(message.message);
      }
    } catch (err) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      {controlsVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.overlay.dark, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, zIndex: 10 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay.light, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
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
          style={{ flex: 1, backgroundColor: colors.surface.lightCream }}
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
          <View style={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, gap: 12 }}>
            {/* Progress Bar */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.base, fontWeight: typography.weight.semibold }}>
                {Math.round(currentProgress * 100)}%
              </Text>
              <View style={{ flex: 1, height: 6, backgroundColor: colors.overlay.light, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.round(currentProgress * 100)}%`, backgroundColor: colors.secondary.lightGold, borderRadius: 3 }} />
              </View>
            </View>
            
            {/* Font Size Controls */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Pressable 
                onPress={() => setFontSize(prev => Math.max(12, prev - 2))}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.overlay.light,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text.onPrimary, fontSize: 18, fontWeight: typography.weight.bold }}>A-</Text>
              </Pressable>
              
              <Text style={{ color: colors.text.onPrimary, fontSize: typography.size.sm, minWidth: 60, textAlign: "center" }}>
                {fontSize}px
              </Text>
              
              <Pressable 
                onPress={() => setFontSize(prev => Math.min(40, prev + 2))}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.overlay.light,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text.onPrimary, fontSize: 20, fontWeight: typography.weight.bold }}>A+</Text>
              </Pressable>
              
              <Pressable 
                onPress={async () => {
                  const estimatedPage = Math.round(currentProgress * volume.totalPages) || 1;
                  await addBookmark(estimatedPage);
                }}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.overlay.light,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="bookmark" size={20} color={colors.text.onPrimary} />
              </Pressable>
              
              <Pressable 
                onPress={() => setBookmarksVisible(true)}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
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
                    onPress={() => {
                      // Jump to bookmark - for now we'll use page estimation
                      setBookmarksVisible(false);
                    }}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.surface.creamyWhite, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <Ionicons name="bookmark" size={20} color={colors.primary.sageGreen} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary }}>Page {bookmark.page}</Text>
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
    </View>
  );
}
