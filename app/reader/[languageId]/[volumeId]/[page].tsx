import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SessionCompletionModal } from "../../../../components/SessionCompletionModal";
import { ZoomableImage } from "../../../../components/ZoomableImage";
import { colors as designColors, typography } from "../../../../constants/theme";
import { BOOK_TITLE } from "../../../../data/book";
import {
  getCurrentSectionByLanguage,
  getLanguageById,
  getVolumeByLanguageAndId,
  getVolumeDisplayTitle,
  shouldShowVolumeLabel,
} from "../../../../data/languages";
import { useBookmarks } from "../../../../hooks/useBookmarks";
import { useCurrentLanguage } from "../../../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../../../hooks/useCurrentVolume";
import { useReadingProgress } from "../../../../hooks/useReadingProgress";
import { useReadingSessions } from "../../../../hooks/useReadingSessions";
import { useReadingTheme } from "../../../../hooks/useReadingTheme";
import { useResolvedPageAsset } from "../../../../hooks/useResolvedPageAsset";
import { prefetchPageAssets } from "../../../../lib/page-asset-resolver";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = IMAGE_WIDTH / 0.7;

function ReaderPageSurface({
  languageId,
  languageTitle,
  volumeId,
  volumeDisplayTitle,
  pageNum,
  showVolumeLabel,
  backgroundColor,
  onPress,
  onZoomChange,
}: {
  languageId: string;
  languageTitle: string;
  volumeId: string;
  volumeDisplayTitle: string;
  pageNum: number;
  showVolumeLabel: boolean;
  backgroundColor: string;
  onPress: () => void;
  onZoomChange: (isZoomed: boolean) => void;
}) {
  const { asset, isLoading } = useResolvedPageAsset(languageId, volumeId, pageNum);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [asset?.uri, asset?.kind, pageNum]);

  if (asset?.source && !hasLoadError) {
    return (
      <ZoomableImage
        source={asset.source}
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
        onPress={onPress}
        onZoomChange={onZoomChange}
        onError={() => {
          setHasLoadError(true);
        }}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: IMAGE_WIDTH,
        height: SCREEN_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor,
      }}
    >
      <Text
        style={{
          color: designColors.text.primary,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
        }}
      >
        {showVolumeLabel
          ? `${languageTitle} • ${volumeDisplayTitle} • Page ${pageNum}`
          : `${languageTitle} • Page ${pageNum}`}
      </Text>
      <Text
        style={{
          color: designColors.text.tertiary,
          fontSize: typography.size.base,
          textAlign: "center",
          paddingHorizontal: 40,
        }}
      >
        {isLoading
          ? "Preparing page..."
          : asset?.kind === "remote" || hasLoadError
            ? "This page is not available offline right now. Connect once or download the volume."
            : "Page source is not available for this language and volume."}
      </Text>
    </Pressable>
  );
}

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    languageId?: string;
    volumeId?: string;
    page?: string;
  }>();
  const language = getLanguageById(params.languageId);
  const volume = getVolumeByLanguageAndId(language.id, params.volumeId);
  const showVolumeLabel = shouldShowVolumeLabel(language.id);
  const volumeDisplayTitle = getVolumeDisplayTitle(language.id, volume.id, volume.title);
  const { switchLanguage } = useCurrentLanguage();
  const { switchVolume } = useCurrentVolume(language.id);
  const totalPages = volume.totalPages;
  const clampPage = useCallback(
    (value: number) => Math.min(Math.max(value, 1), totalPages),
    [totalPages],
  );
  const initialPage = clampPage(Number(params.page ?? 1) || 1);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const { saveProgress } = useReadingProgress(volume.id, language.id);
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkForPage } =
    useBookmarks(volume.id, language.id);
  const { theme, cycleTheme, colors } = useReadingTheme();
  const { addSession, getCurrentStreak } = useReadingSessions();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPageModalVisible, setIsPageModalVisible] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    pagesRead: number;
    durationMinutes: number;
    currentStreak: number;
    isNewStreak: boolean;
  } | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const sessionStartTime = useRef(Date.now());
  const sessionMinPage = useRef(initialPage);
  const sessionMaxPage = useRef(initialPage);

  const currentSection =
    getCurrentSectionByLanguage(language.id, volume.id, currentPage) ??
    volume.sections[0];

  const pageIsBookmarked = isBookmarked(currentPage);

  const toggleControls = useCallback(() => {
    // Controls are always visible now, this is just for tap handling.
  }, []);

  useEffect(() => {
    void switchLanguage(language.id);
    void switchVolume(volume.id);
  }, [language.id, switchLanguage, switchVolume, volume.id]);

  const completeSession = useCallback(async () => {
    const endTime = Date.now();
    const durationMs = endTime - sessionStartTime.current;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const pagesRead = sessionMaxPage.current - sessionMinPage.current + 1;
    const shouldShowModal = durationMs >= 180000 || pagesRead >= 5;

    if (durationMs >= 30000) {
      const previousStreak = getCurrentStreak();

      await addSession({
        languageId: language.id,
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
  }, [addSession, getCurrentStreak, language.id, volume.id]);

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
    setCurrentPage((previousPage) => {
      if (previousPage === routePage) {
        return previousPage;
      }

      flatListRef.current?.scrollToIndex({
        index: routePage - 1,
        animated: false,
      });
      return routePage;
    });
  }, [clampPage, params.page]);

  useEffect(() => {
    sessionMinPage.current = Math.min(sessionMinPage.current, currentPage);
    sessionMaxPage.current = Math.max(sessionMaxPage.current, currentPage);
  }, [currentPage]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    const pagesToPrefetch = Array.from(
      new Set([
        currentPage,
        currentPage + 1,
        currentPage + 2,
        currentPage - 1,
      ]),
    ).filter((page) => page >= 1 && page <= totalPages);

    void prefetchPageAssets(language.id, volume.id, pagesToPrefetch);
  }, [currentPage, language.id, totalPages, volume.id]);

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

  const renderPage = ({ item: pageNum }: { item: number }) => (
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
        <ReaderPageSurface
          languageId={language.id}
          languageTitle={language.title}
          volumeId={volume.id}
          volumeDisplayTitle={volumeDisplayTitle}
          pageNum={pageNum}
          showVolumeLabel={showVolumeLabel}
          backgroundColor={colors.background}
          onPress={toggleControls}
          onZoomChange={setIsZoomed}
        />
      </ScrollView>
    </View>
  );

  const submitPageInput = useCallback(() => {
    const parsedPage = Number(pageInput.replace(/[^0-9]/g, ""));
    moveToPage(Number.isFinite(parsedPage) ? parsedPage : currentPage);
    setIsPageModalVisible(false);
  }, [currentPage, moveToPage, pageInput]);

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
            keyExtractor={(item) => `${language.id}-${volume.id}-page-${item}`}
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

      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
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
            {showVolumeLabel
              ? `${language.title} • ${volumeDisplayTitle} • ${currentSection.title}`
              : `${language.title} • ${currentSection.title}`}
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
      </View>

      <SafeAreaView
        edges={["bottom"]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: designColors.overlay.dark,
        }}
      >
        <View
          style={{
            paddingTop: 16,
            paddingBottom: 16,
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
              onPress={() => setIsPageModalVisible(true)}
              style={({ pressed }) => ({
                minWidth: 72,
                height: 48,
                borderRadius: 24,
                paddingHorizontal: 18,
                backgroundColor: designColors.primary.sageGreen,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "#FFF9EA", fontSize: typography.size.base, fontWeight: typography.weight.bold }}>Go</Text>
            </Pressable>

            <View style={{ flex: 1, alignItems: "center", gap: 8, transform: [{ translateX: 14 }] }}>
              <Text
                style={{
                  color: "#FFF9EA",
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold,
                }}
              >
                Page {currentPage} of {totalPages}
              </Text>
              <View
                style={{
                  width: "100%",
                  height: 6,
                  backgroundColor: "rgba(255, 249, 234, 0.2)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round((currentPage / totalPages) * 100)}%`,
                    backgroundColor: designColors.secondary.lightGold,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
            <View style={{ width: 72 }} />
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={isPageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPageModalVisible(false)}
      >
        <Pressable
          onPress={() => setIsPageModalVisible(false)}
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: "100%", maxWidth: 360, borderRadius: 24, backgroundColor: colors.background, padding: 20, gap: 16 }}
          >
            <Text style={{ color: designColors.text.primary, fontSize: typography.size.xl, fontWeight: typography.weight.bold }}>
              Go to page
            </Text>
            <TextInput
              autoFocus
              value={pageInput}
              onChangeText={(value) => setPageInput(value.replace(/[^0-9]/g, ""))}
              onSubmitEditing={submitPageInput}
              keyboardType="number-pad"
              placeholder={`Enter page 1-${totalPages}`}
              placeholderTextColor={designColors.text.subtle}
              style={{ height: 48, borderRadius: 16, paddingHorizontal: 16, backgroundColor: designColors.surface.creamyWhite, color: designColors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
              <Pressable
                onPress={() => setIsPageModalVisible(false)}
                style={({ pressed }) => ({ height: 44, borderRadius: 22, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: designColors.surface.creamyWhite, opacity: pressed ? 0.8 : 1 })}
              >
                <Text style={{ color: designColors.text.primary, fontSize: typography.size.base, fontWeight: typography.weight.semibold }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitPageInput}
                style={({ pressed }) => ({ height: 44, borderRadius: 22, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: designColors.secondary.lightGold, opacity: pressed ? 0.8 : 1 })}
              >
                <Text style={{ color: designColors.primary.deepGreen, fontSize: typography.size.base, fontWeight: typography.weight.bold }}>Go</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
