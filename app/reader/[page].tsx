import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  ViewToken,
} from "react-native";

import { SessionCompletionModal } from "../../components/SessionCompletionModal";
import { ZoomableImage } from "../../components/ZoomableImage";
import { BOOK_TITLE, SECTIONS, TOTAL_PAGES } from "../../data/book";
import { getPageImage } from "../../data/pages";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReadingProgress } from "../../hooks/useReadingProgress";
import { useReadingSessions } from "../../hooks/useReadingSessions";
import { useReadingTheme } from "../../hooks/useReadingTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function clampPage(value: number) {
  return Math.min(Math.max(value, 1), TOTAL_PAGES);
}

// Generate array of page numbers [1, 2, 3, ..., 489]
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

// Calculate image dimensions to fit screen width while maintaining aspect ratio
const IMAGE_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = IMAGE_WIDTH / 0.7; // A4 portrait aspect ratio (0.7 = width/height)

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = clampPage(Number(params.page ?? 1) || 1);
  const { saveProgress } = useReadingProgress();
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkForPage } = useBookmarks();
  const { theme, cycleTheme, colors } = useReadingTheme();
  const { addSession, getCurrentStreak } = useReadingSessions();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    pagesRead: number;
    durationMinutes: number;
    currentStreak: number;
    isNewStreak: boolean;
  } | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Session tracking
  const sessionStartPage = useRef(initialPage);
  const sessionStartTime = useRef(Date.now());
  const sessionMinPage = useRef(initialPage);
  const sessionMaxPage = useRef(initialPage);

  const currentSection =
    SECTIONS.find(
      (section) => currentPage >= section.startPage && currentPage <= section.endPage,
    ) ?? SECTIONS[0];

  const pageIsBookmarked = isBookmarked(currentPage);

  const toggleBookmark = async () => {
    if (pageIsBookmarked) {
      const bookmarkData = getBookmarkForPage(currentPage);
      if (bookmarkData) {
        await removeBookmark(bookmarkData.id);
      }
    } else {
      await addBookmark(currentPage);
    }
  };

  // Debounced save progress when page changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveProgress(currentPage);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentPage]);

  // Track page range for session
  useEffect(() => {
    sessionMinPage.current = Math.min(sessionMinPage.current, currentPage);
    sessionMaxPage.current = Math.max(sessionMaxPage.current, currentPage);
  }, [currentPage]);

  // Function to complete session and show modal
  const completeSession = async () => {
    const endTime = Date.now();
    const durationMs = endTime - sessionStartTime.current;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const pagesRead = sessionMaxPage.current - sessionMinPage.current + 1;

    // Only show modal if session was meaningful (3+ minutes or 5+ pages)
    const shouldShowModal = durationMs >= 180000 || pagesRead >= 5;

    if (durationMs >= 30000) {
      const previousStreak = getCurrentStreak();

      await addSession({
        date: new Date().toISOString(),
        pagesRead,
        startPage: sessionMinPage.current,
        endPage: sessionMaxPage.current,
        durationMinutes,
      });

      if (shouldShowModal) {
        const newStreak = getCurrentStreak();
        const isNewStreak = newStreak > previousStreak;

        setCompletionData({
          pagesRead,
          durationMinutes,
          currentStreak: newStreak,
          isNewStreak,
        });
        setShowCompletionModal(true);
        return true; // Indicate modal will be shown
      }
    }
    return false; // No modal
  };

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // If modal is showing, close it
        if (showCompletionModal) {
          setShowCompletionModal(false);
          return true; // Prevent default
        }

        // Complete session and check if modal should show
        completeSession().then((showingModal) => {
          if (!showingModal) {
            // No modal, allow back navigation
            router.back();
          }
          // If modal is showing, it will be handled by user choice
        });
        return true; // Prevent default back behavior
      },
    );

    return () => backHandler.remove();
  }, [showCompletionModal]);

  // Save session on unmount (for iOS or other navigation)
  useEffect(() => {
    return () => {
      void completeSession();
    };
  }, []);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (controlsVisible) {
      hideTimeoutRef.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [controlsVisible]);

  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideControls = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setControlsVisible(false);
    });
  };

  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  };

  const moveToPage = (nextPageNum: number) => {
    const safePage = clampPage(nextPageNum);
    setCurrentPage(safePage);
    flatListRef.current?.scrollToIndex({
      index: safePage - 1,
      animated: true,
    });
  };

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        const visiblePage = viewableItems[0].item as number;
        if (visiblePage !== currentPage) {
          setCurrentPage(visiblePage);
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPage = ({ item: pageNum }: { item: number }) => {
    const pageImage = getPageImage(pageNum);

    return (
      <View
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "center",
            minHeight: SCREEN_HEIGHT,
          }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
          scrollEnabled={!isZoomed}
        >
          {pageImage ? (
            <ZoomableImage
              source={pageImage}
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              onPress={toggleControls}
              onZoomChange={setIsZoomed}
            />
          ) : (
            <Pressable
              onPress={toggleControls}
              style={{
                width: IMAGE_WIDTH,
                height: SCREEN_HEIGHT,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Text style={{ color: "#173D31", fontSize: 18, fontWeight: "700" }}>
                Page {pageNum}
              </Text>
              <Text
                style={{
                  color: "#55665D",
                  fontSize: 14,
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                Images not yet generated.{"\n"}Run the conversion script first.
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Page Reader - Horizontal FlatList with Vertical Scroll per Page */}
      <View style={{ flex: 1 }}>
        {Platform.OS === "web" ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              gap: 10,
            }}
          >
            <Text style={{ color: "#173D31", fontSize: 17, fontWeight: "800" }}>
              Image-based reader is ready
            </Text>
            <Text
              style={{
                color: "#55665D",
                fontSize: 14,
                lineHeight: 21,
                textAlign: "center",
              }}
            >
              This renderer targets Android and iOS. Web support coming soon.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={PAGES}
            renderItem={renderPage}
            keyExtractor={(item) => `page-${item}`}
            horizontal
            pagingEnabled
            scrollEnabled={!isZoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialPage - 1}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            windowSize={3}
            maxToRenderPerBatch={3}
            initialNumToRender={3}
            removeClippedSubviews={true}
            onScrollToIndexFailed={(info) => {
              console.log("Scroll to index failed:", info);
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              }, 100);
            }}
          />
        )}
      </View>

      {/* Top Controls - Auto-hide */}
      {controlsVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            opacity: fadeAnim,
            backgroundColor: "rgba(23, 61, 49, 0.95)",
            paddingTop: 50,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 249, 234, 0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF9EA" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF9EA", fontSize: 16, fontWeight: "700" }}>
              {BOOK_TITLE}
            </Text>
            <Text style={{ color: "#C8D5CD", fontSize: 14, fontWeight: "600" }}>
              {currentSection.title}
            </Text>
          </View>
          <Pressable
            onPress={cycleTheme}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 249, 234, 0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={
                theme === "light"
                  ? "sunny-outline"
                  : theme === "sepia"
                    ? "book-outline"
                    : "moon-outline"
              }
              size={22}
              color="#FFF9EA"
            />
          </Pressable>
          <Pressable
            onPress={toggleBookmark}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 249, 234, 0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={pageIsBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color="#FFF9EA"
            />
          </Pressable>
        </Animated.View>
      )}

      {/* Bottom Controls - Auto-hide */}
      {controlsVisible && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            opacity: fadeAnim,
            backgroundColor: "rgba(23, 61, 49, 0.95)",
            paddingTop: 16,
            paddingBottom: 32,
            paddingHorizontal: 16,
            gap: 16,
          }}
        >
          {/* Page Navigation */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <Pressable
              disabled={currentPage <= 1}
              onPress={() => moveToPage(currentPage - 1)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  currentPage <= 1 ? "rgba(255, 249, 234, 0.1)" : "rgba(240, 225, 167, 0.9)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={currentPage <= 1 ? "#7A8A82" : "#173D31"}
              />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "#FFF9EA", fontSize: 16, fontWeight: "700" }}>
                Page {currentPage} of {TOTAL_PAGES}
              </Text>
              <Text style={{ color: "#C8D5CD", fontSize: 13 }}>
                {Math.round((currentPage / TOTAL_PAGES) * 100)}% complete
              </Text>
            </View>

            <Pressable
              disabled={currentPage >= TOTAL_PAGES}
              onPress={() => moveToPage(currentPage + 1)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  currentPage >= TOTAL_PAGES
                    ? "rgba(255, 249, 234, 0.1)"
                    : "rgba(240, 225, 167, 0.9)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={currentPage >= TOTAL_PAGES ? "#7A8A82" : "#173D31"}
              />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Session Completion Modal */}
      {showCompletionModal && completionData && (
        <SessionCompletionModal
          visible={showCompletionModal}
          onClose={() => {
            // Close modal without navigation (back button pressed on modal)
            setShowCompletionModal(false);
          }}
          onContinue={() => {
            // Just close modal, stay in reader
            setShowCompletionModal(false);
          }}
          onGoHome={() => {
            // Close modal and navigate home
            setShowCompletionModal(false);
            setTimeout(() => router.push("/(tabs)/" as any), 100);
          }}
          pagesRead={completionData.pagesRead}
          durationMinutes={completionData.durationMinutes}
          currentStreak={completionData.currentStreak}
          isNewStreak={completionData.isNewStreak}
        />
      )}
    </View>
  );
}
