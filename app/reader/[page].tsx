import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  ViewToken,
} from "react-native";

import { ZoomableImage } from "../../components/ZoomableImage";
import { BOOK_TITLE, SECTIONS, TOTAL_PAGES } from "../../data/book";
import { getPageImage } from "../../data/pages";
import { useReadingProgress } from "../../hooks/useReadingProgress";

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

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentSection =
    SECTIONS.find(
      (section) => currentPage >= section.startPage && currentPage <= section.endPage,
    ) ?? SECTIONS[0];

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
          backgroundColor: "#FBF7EE",
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
        >
          {pageImage ? (
            <ZoomableImage
              source={pageImage}
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              onPress={toggleControls}
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
    <View style={{ flex: 1, backgroundColor: "#FBF7EE" }}>
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
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 249, 234, 0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="bookmark-outline" size={22} color="#FFF9EA" />
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
    </View>
  );
}
