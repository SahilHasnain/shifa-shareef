import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { SessionCompletionModal } from "../../../components/SessionCompletionModal";
import { ZoomableImage } from "../../../components/ZoomableImage";
import { colors as designColors, typography } from "../../../constants/theme";
import { BOOK_TITLE } from "../../../data/book";
import { getPageImageForVolume, getVolumeById } from "../../../data/volumes";
import { useBookmarks } from "../../../hooks/useBookmarks";
import { useReadingProgress } from "../../../hooks/useReadingProgress";
import { useReadingSessions } from "../../../hooks/useReadingSessions";
import { useReadingTheme } from "../../../hooks/useReadingTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = IMAGE_WIDTH / 0.7;

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ volumeId?: string; page?: string }>();
  const volume = getVolumeById(params.volumeId);
  const totalPages = volume.totalPages;
  const clampPage = useCallback(
    (value: number) => Math.min(Math.max(value, 1), totalPages),
    [totalPages],
  );
  const initialPage = clampPage(Number(params.page ?? 1) || 1);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const { saveProgress } = useReadingProgress(volume.id);
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkForPage } =
    useBookmarks(volume.id);
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
  const sessionStartTime = useRef(Date.now());
  const sessionMinPage = useRef(initialPage);
  const sessionMaxPage = useRef(initialPage);

  const currentSection =
    volume.sections.find(
      (section) =>
        currentPage >= section.startPage && currentPage <= section.endPage,
    ) ?? volume.sections[0];

  const pageIsBookmarked = isBookmarked(currentPage);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const hideControls = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setControlsVisible(false);
    });
  }, [fadeAnim]);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  }, [controlsVisible, hideControls, showControls]);

  const completeSession = useCallback(async () => {
    const endTime = Date.now();
    const durationMs = endTime - sessionStartTime.current;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const pagesRead = sessionMaxPage.current - sessionMinPage.current + 1;
    const shouldShowModal = durationMs >= 180000 || pagesRead >= 5;

    if (durationMs >= 30000) {
      const previousStreak = getCurrentStreak();

      await addSession({
        volumeId: volume.id,
        date: new Date().toISOString(),
        pagesRead,
        startPage: sessionMinPage.current,
        endPage: sessionMaxPage.current,
        durationMinutes,
      });

      if (shouldShowModal) {
        const newStreak = getCurrentStreak();

        setCompletionData({
          pagesRead,
          durationMinutes,
          currentStreak: newStreak,
          isNewStreak: newStreak > previousStreak,
        });
        setShowCompletionModal(true);
        return true;
      }
    }

    return false;
  }, [addSession, getCurrentStreak, volume.id]);

  const moveToPage = useCallback(
    (nextPageNum: number) => {
      const safePage = clampPage(nextPageNum);
      setCurrentPage(safePage);
      flatListRef.current?.scrollToIndex({
        index: safePage - 1,
        animated: true,
      });
    },
    [clampPage],
  );

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
  }, [currentPage, saveProgress]);

  useEffect(() => {
    const routePage = clampPage(Number(params.page ?? 1) || 1);
    if (routePage === currentPage) {
      return;
    }

    setCurrentPage(routePage);
    flatListRef.current?.scrollToIndex({
      index: routePage - 1,
      animated: false,
    });
  }, [clampPage, currentPage, params.page]);

  useEffect(() => {
    sessionMinPage.current = Math.min(sessionMinPage.current, currentPage);
    sessionMaxPage.current = Math.max(sessionMaxPage.current, currentPage);
  }, [currentPage]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
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
      },
    );

    return () => backHandler.remove();
  }, [completeSession, router, showCompletionModal]);

  useEffect(() => {
    return () => {
      void completeSession();
    };
  }, [completeSession]);

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
  }, [controlsVisible, hideControls]);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        const visiblePage = viewableItems[0].item as number;
        setCurrentPage((previousPage) =>
          previousPage === visiblePage ? previousPage : visiblePage,
        );
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPage = ({ item: pageNum }: { item: number }) => {
    const pageImage = getPageImageForVolume(volume.id, pageNum);

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
          bounces
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
              <Text
                style={{
                  color: designColors.text.primary,
                  fontSize: typography.size.xl,
                  fontWeight: typography.weight.bold,
                }}
              >
                {volume.title} • Page {pageNum}
              </Text>
              <Text
                style={{
                  color: designColors.text.tertiary,
                  fontSize: typography.size.base,
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                Images not yet generated for this volume.
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            <Text
              style={{
                color: designColors.text.primary,
                fontSize: typography.size.xl,
                fontWeight: typography.weight.extrabold,
              }}
            >
              Image-based reader is ready
            </Text>
            <Text
              style={{
                color: designColors.text.tertiary,
                fontSize: typography.size.base,
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
            data={pages}
            renderItem={renderPage}
            keyExtractor={(item) => `${volume.id}-page-${item}`}
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
            removeClippedSubviews
            onScrollToIndexFailed={(info) => {
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

      {controlsVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            opacity: fadeAnim,
            backgroundColor: designColors.overlay.dark,
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
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: designColors.overlay.light,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF9EA" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FFF9EA",
                fontSize: typography.size.lg,
                fontWeight: typography.weight.bold,
              }}
            >
              {BOOK_TITLE}
            </Text>
            <Text
              style={{
                color: "#C6D4CB",
                fontSize: typography.size.base,
                fontWeight: typography.weight.semibold,
              }}
            >
              {volume.title} • {currentSection.title}
            </Text>
          </View>
          <Pressable
            onPress={cycleTheme}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: designColors.overlay.light,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
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
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: designColors.overlay.light,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name={pageIsBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color="#FFF9EA"
            />
          </Pressable>
        </Animated.View>
      )}

      {controlsVisible && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            opacity: fadeAnim,
            backgroundColor: designColors.overlay.dark,
            paddingTop: 16,
            paddingBottom: 32,
            paddingHorizontal: 16,
            gap: 16,
          }}
        >
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
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  currentPage <= 1
                    ? designColors.overlay.medium
                    : designColors.secondary.lightGold,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed && currentPage > 1 ? 0.8 : 1,
              })}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={
                  currentPage <= 1
                    ? designColors.text.subtle
                    : designColors.primary.deepGreen
                }
              />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  color: "#FFF9EA",
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold,
                }}
              >
                Page {currentPage} of {totalPages}
              </Text>
              <Text
                style={{
                  color: "#C6D4CB",
                  fontSize: typography.size.sm,
                }}
              >
                {Math.round((currentPage / totalPages) * 100)}% complete
              </Text>
            </View>

            <Pressable
              disabled={currentPage >= totalPages}
              onPress={() => moveToPage(currentPage + 1)}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  currentPage >= totalPages
                    ? designColors.overlay.medium
                    : designColors.secondary.lightGold,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed && currentPage < totalPages ? 0.8 : 1,
              })}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={
                  currentPage >= totalPages
                    ? designColors.text.subtle
                    : designColors.primary.deepGreen
                }
              />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {showCompletionModal && completionData && (
        <SessionCompletionModal
          visible={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
          }}
          onContinue={() => {
            setShowCompletionModal(false);
          }}
          onGoHome={() => {
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
