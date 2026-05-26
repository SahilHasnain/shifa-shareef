import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import { BOOK_TITLE } from "../../data/book";
import {
  LANGUAGES,
  getCurrentSectionByLanguage,
  getVolumeByLanguageAndId,
  getVolumeDisplayTitle,
  shouldShowVolumeLabel,
} from "../../data/languages";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingProgress } from "../../hooks/useReadingProgress";
import { useVolumeDownload } from "../../hooks/useVolumeDownload";

function formatLastRead(value?: string) {
  if (!value) {
    return "Not started yet";
  }

  const date = new Date(value);
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ContinueReadingContent({
  languageId,
  languageTitle,
  volumeId,
  showVolumeLabel,
}: {
  languageId: string;
  languageTitle: string;
  volumeId: string;
  showVolumeLabel: boolean;
}) {
  const volume = getVolumeByLanguageAndId(languageId, volumeId);
  const { progress, isLoaded } = useReadingProgress(volumeId, languageId);

  const currentPage = progress?.lastPage ?? 1;
  const currentSection =
    getCurrentSectionByLanguage(languageId, volumeId, currentPage) ?? volume.sections[0];
  const currentVolumeDisplayTitle = getVolumeDisplayTitle(
    languageId,
    volumeId,
    volume.title,
  );

  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          color: colors.text.light,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {showVolumeLabel
          ? `${languageTitle} • ${currentVolumeDisplayTitle}`
          : languageTitle}
      </Text>
      <Text
        style={{
          color: "#FFF9EA",
          fontSize: typography.size["3xl"],
          fontWeight: typography.weight.extrabold,
          lineHeight: 32,
        }}
      >
        {currentSection.title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            borderRadius: 999,
            backgroundColor: "rgba(255, 249, 234, 0.14)",
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              color: "#FFF9EA",
              fontSize: typography.size.sm,
              fontWeight: typography.weight.bold,
            }}
          >
            Page {currentPage}/{volume.totalPages}
          </Text>
        </View>
        <Text
          style={{
            color: "#C8D5CD",
            fontSize: typography.size.sm,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {isLoaded ? `Last read ${formatLastRead(progress?.lastReadAt)}` : "Loading progress..."}
        </Text>
      </View>
    </View>
  );
}

function getDownloadStatusLabel({
  canDownload,
  deliveryMode,
  isDownloading,
  isFullyDownloaded,
  isPartiallyDownloaded,
}: {
  canDownload: boolean;
  deliveryMode: "bundled" | "remote" | "hybrid";
  isDownloading: boolean;
  isFullyDownloaded: boolean;
  isPartiallyDownloaded: boolean;
}) {
  if (deliveryMode === "bundled" && !canDownload) {
    return "Included in app";
  }

  if (isDownloading) {
    return "Downloading";
  }

  if (isFullyDownloaded) {
    return "Ready offline";
  }

  if (isPartiallyDownloaded) {
    return "Partially offline";
  }

  return "Available online";
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAnimatingRef = useRef(false);
  const lastLanguageIdRef = useRef<string | null>(null);
  const slideX = useSharedValue(0);
  const fade = useSharedValue(1);

  const { currentLanguage, currentLanguageId, switchLanguage } = useCurrentLanguage();
  const { currentVolume, currentVolumeId, switchVolume } = useCurrentVolume(currentLanguageId);
  const { progress } = useReadingProgress(currentVolumeId, currentLanguageId);
  const { activePlan } = useReadingPlan(currentVolumeId, currentLanguageId);

  const [displayVolumeId, setDisplayVolumeId] = useState(currentVolumeId);

  const currentPage = progress?.lastPage ?? 1;
  const showVolumeControls = shouldShowVolumeLabel(currentLanguageId);
  const currentVolumeIndex = useMemo(
    () =>
      Math.max(
        0,
        currentLanguage.volumes.findIndex((volume) => volume.id === displayVolumeId),
      ),
    [currentLanguage.volumes, displayVolumeId],
  );
  const currentDisplayVolume =
    currentLanguage.volumes[currentVolumeIndex] ?? currentLanguage.volumes[0];
  const currentDisplayProgress = useReadingProgress(
    currentDisplayVolume.id,
    currentLanguageId,
  ).progress;
  const {
    canDownload,
    deliveryMode,
    downloadAll,
    isDownloading,
    isFullyDownloaded,
    isPartiallyDownloaded,
    progressPercent: downloadProgressPercent,
    removeDownload,
  } = useVolumeDownload(
    currentLanguageId,
    currentDisplayVolume.id,
    currentDisplayVolume.totalPages,
  );
  const currentDisplayPage = currentDisplayProgress?.lastPage ?? 1;
  const currentPlanDay = activePlan
    ? activePlan.items.find(
      (item) => currentPage >= item.startPage && currentPage <= item.endPage,
    )?.day ?? 1
    : 1;
  const currentPlanProgress = activePlan
    ? Math.round((currentPlanDay / activePlan.totalDays) * 100)
    : 0;
  const downloadStatusLabel = getDownloadStatusLabel({
    canDownload,
    deliveryMode,
    isDownloading,
    isFullyDownloaded,
    isPartiallyDownloaded,
  });
  const downloadButtonLabel = canDownload
    ? isFullyDownloaded
      ? "Remove"
      : isDownloading
        ? "Loading"
        : "Download"
    : "Included";

  const animatedHeroContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: fade.value,
  }));

  useEffect(() => {
    if (lastLanguageIdRef.current !== currentLanguageId) {
      lastLanguageIdRef.current = currentLanguageId;
      setDisplayVolumeId(currentVolumeId);
      slideX.value = 0;
      fade.value = 1;
      isAnimatingRef.current = false;
      return;
    }

    if (!isAnimatingRef.current && currentVolumeId !== displayVolumeId) {
      setDisplayVolumeId(currentVolumeId);
    }
  }, [currentVolumeId, currentLanguageId, displayVolumeId, fade, slideX]);

  const resetHeroPosition = useCallback(() => {
    slideX.value = withSpring(0, {
      damping: 18,
      stiffness: 240,
      mass: 0.6,
    });
    fade.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    });
  }, [fade, slideX]);

  useEffect(() => {
    slideX.value = 0;
    fade.value = 1;
    isAnimatingRef.current = false;
  }, [currentLanguageId, fade, slideX]);

  const finalizeVolumeTransition = useCallback((nextVolumeId: string, incomingOffset: number) => {
    setDisplayVolumeId(nextVolumeId);
    slideX.value = incomingOffset;
    fade.value = 0;
    slideX.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    fade.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    isAnimatingRef.current = false;
    void switchVolume(nextVolumeId);
  }, [fade, slideX, switchVolume]);

  const animateToVolume = useCallback((nextIndex: number, direction: "next" | "previous") => {
    const nextVolume = currentLanguage.volumes[nextIndex];
    if (!nextVolume || isAnimatingRef.current) {
      resetHeroPosition();
      return;
    }

    isAnimatingRef.current = true;
    const offset = direction === "next" ? -48 : 48;

    slideX.value = withTiming(offset, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
    fade.value = withTiming(0, {
      duration: 130,
      easing: Easing.out(Easing.quad),
    });
    setTimeout(() => {
      finalizeVolumeTransition(nextVolume.id, -offset);
    }, 150);
  }, [currentLanguage.volumes, fade, finalizeVolumeTransition, resetHeroPosition, slideX]);

  const goToNextVolume = useCallback(() => {
    animateToVolume(currentVolumeIndex + 1, "next");
  }, [animateToVolume, currentVolumeIndex]);

  const goToPreviousVolume = useCallback(() => {
    animateToVolume(currentVolumeIndex - 1, "previous");
  }, [animateToVolume, currentVolumeIndex]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 5,
          paddingHorizontal: 20,
          gap: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            {BOOK_TITLE}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 8 }}
          >
            {LANGUAGES.map((language) => {
              const isActive = language.id === currentLanguageId;

              return (
                <Pressable
                  key={language.id}
                  onPress={() => switchLanguage(language.id)}
                  style={({ pressed }) => ({
                    backgroundColor: isActive
                      ? colors.secondary.lightGold
                      : colors.surface.warmIvory,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 18,
                    opacity: pressed ? 0.92 : 1,
                    ...shadows.sm,
                  })}
                >
                  <Text
                    style={{
                      color: isActive ? colors.primary.deepGreen : colors.text.tertiary,
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.bold,
                    }}
                  >
                    {language.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View
          style={{
            backgroundColor: colors.primary.deepGreen,
            borderRadius: 28,
            padding: 24,
            gap: 18,
            overflow: "hidden",
            ...shadows.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              style={{
                color: colors.text.light,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.bold,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Continue Reading
            </Text>
            {showVolumeControls && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={goToPreviousVolume}
                  disabled={currentVolumeIndex <= 0}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor:
                      currentVolumeIndex > 0
                        ? "rgba(255, 249, 234, 0.14)"
                        : "rgba(255, 249, 234, 0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed && currentVolumeIndex > 0 ? 0.85 : 1,
                  })}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={
                      currentVolumeIndex > 0
                        ? "#FFF9EA"
                        : "rgba(255, 249, 234, 0.35)"
                    }
                  />
                </Pressable>
                <Pressable
                  onPress={goToNextVolume}
                  disabled={currentVolumeIndex >= currentLanguage.volumes.length - 1}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor:
                      currentVolumeIndex < currentLanguage.volumes.length - 1
                        ? "rgba(255, 249, 234, 0.14)"
                        : "rgba(255, 249, 234, 0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity:
                      pressed &&
                        currentVolumeIndex < currentLanguage.volumes.length - 1
                        ? 0.85
                        : 1,
                  })}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      currentVolumeIndex < currentLanguage.volumes.length - 1
                        ? "#FFF9EA"
                        : "rgba(255, 249, 234, 0.35)"
                    }
                  />
                </Pressable>
              </View>
            )}
          </View>

          <Animated.View
            style={[
              {
                gap: 16,
              },
              animatedHeroContentStyle,
            ]}
          >
            <ContinueReadingContent
              languageId={currentLanguageId}
              languageTitle={currentLanguage.title}
              volumeId={displayVolumeId}
              showVolumeLabel={showVolumeControls}
            />

            <View
              style={{
                display: "none",
              }}
            >
              <View style={{ display: "none" }}>
                <Text
                  style={{
                    color: "#FFF9EA",
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.semibold,
                  }}
                >
                  {downloadStatusLabel}
                  {canDownload && (isPartiallyDownloaded || isFullyDownloaded)
                    ? ` • ${downloadProgressPercent}%`
                    : ""}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  if (canDownload) {
                    if (isFullyDownloaded) {
                      void removeDownload();
                    } else {
                      void downloadAll();
                    }
                  }
                }}
                disabled={!canDownload || isDownloading}
              >
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: canDownload && !isFullyDownloaded ? "#EFD997" : "rgba(255, 249, 234, 0.15)",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      color: canDownload && !isFullyDownloaded ? "#173D31" : "#FFF9EA",
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.bold,
                    }}
                  >
                    {canDownload
                      ? isFullyDownloaded
                        ? "Remove"
                        : isDownloading
                          ? "Downloading..."
                          : "Download"
                      : "Included"}
                  </Text>
                </View>
              </Pressable>
            </View>

            {showVolumeControls && (
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: -2 }}>
                {currentLanguage.volumes.map((volume, index) => (
                  <View
                    key={volume.id}
                    style={{
                      width: index === currentVolumeIndex ? 18 : 6,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor:
                        index === currentVolumeIndex
                          ? colors.secondary.lightGold
                          : "rgba(255, 249, 234, 0.22)",
                    }}
                  />
                ))}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => {
                  if (canDownload) {
                    if (isFullyDownloaded) {
                      void removeDownload();
                    } else {
                      void downloadAll();
                    }
                  }
                }}
                disabled={!canDownload || isDownloading}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: canDownload && !isFullyDownloaded ? "#EFD997" : "rgba(255, 249, 234, 0.15)",
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: canDownload && !isFullyDownloaded ? "#173D31" : "#FFF9EA",
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.bold,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                  >
                    {downloadButtonLabel}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push(
                    `/reader/${currentLanguageId}/${displayVolumeId}/${currentDisplayPage}` as any,
                  )
                }
                style={{
                  flex: 1.35,
                  borderRadius: 999,
                  backgroundColor: "#F0E1A7",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#173D31",
                    fontSize: 15,
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  Resume Reading
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {activePlan ? (
          <View
            style={{
              backgroundColor: colors.surface.warmIvory,
              borderRadius: 24,
              padding: 20,
              gap: 14,
              ...shadows.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.secondary.mutedGold,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.bold,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Active Plan
                </Text>
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: typography.size.xl,
                    fontWeight: typography.weight.extrabold,
                    marginTop: 4,
                  }}
                >
                  {activePlan.title}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/plans/" as any)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "rgba(201, 169, 97, 0.12)",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: colors.secondary.mutedGold,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  View
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text.muted,
                    fontSize: typography.size.base,
                  }}
                >
                  Day {currentPlanDay} of {activePlan.totalDays}
                </Text>
                <Text
                  style={{
                    color: colors.secondary.mutedGold,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  {currentPlanProgress}%
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: "rgba(201, 169, 97, 0.15)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${currentPlanProgress}%`,
                    backgroundColor: colors.secondary.mutedGold,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/plans/" as any)}
            style={({ pressed }) => ({
              backgroundColor: "#F3E7C9",
              borderRadius: 24,
              padding: 22,
              gap: 16,
              opacity: pressed ? 0.95 : 1,
              ...shadows.md,
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <View
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    backgroundColor: "rgba(23, 61, 49, 0.08)",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.primary.deepGreen,
                      fontSize: typography.size.xs,
                      fontWeight: typography.weight.extrabold,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    Reading Plan
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: typography.size["2xl"],
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  Choose a Reading Plan
                </Text>
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontSize: typography.size.base,
                    lineHeight: 22,
                  }}
                >
                  Build consistency with a gentle structure that fits your pace.
                </Text>
              </View>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(23, 61, 49, 0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={24}
                  color={colors.primary.deepGreen}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                style={{
                  color: colors.secondary.mutedGold,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.bold,
                  flex: 1,
                }}
              >
                1-week, 3-week, and flexible plans
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: colors.primary.deepGreen,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  View plans
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.primary.deepGreen}
                />
              </View>
            </View>
          </Pressable>
        )
        }

        <View
          style={{
            backgroundColor: colors.surface.warmIvory,
            borderRadius: 24,
            padding: 20,
            gap: 12,
            ...shadows.sm,
          }}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size.xl,
              fontWeight: typography.weight.extrabold,
            }}
          >
            Today&apos;s gentle target
          </Text>
          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.md,
              lineHeight: 23,
            }}
          >
            Read 2 pages from your current place. The goal is consistency, not speed.
          </Text>
          <Pressable
            onPress={() =>
              router.push(
                `/reader/${currentLanguageId}/${currentVolumeId}/${currentPage}` as any,
              )
            }
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: colors.secondary.warmGold,
              paddingHorizontal: 18,
              paddingVertical: 11,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.base,
                fontWeight: typography.weight.bold,
              }}
            >
              Read for 5 minutes
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: colors.surface.creamyWhite,
            borderRadius: 24,
            padding: 20,
            gap: 14,
            ...shadows.sm,
          }}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size.xl,
              fontWeight: typography.weight.extrabold,
            }}
          >
            Reading Structure
          </Text>
          {currentVolume.sections.slice(0, 3).map((section) => (
            <View
              key={section.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.primary.forestGreen,
                    fontSize: typography.size.md,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  {section.title}
                </Text>
                <Text
                  style={{
                    color: colors.text.muted,
                    fontSize: typography.size.sm,
                    marginTop: 2,
                  }}
                >
                  Pages {section.startPage}-{section.endPage}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.secondary.mutedGold,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.bold,
                }}
              >
                {section.estimatedMinutes} min
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: colors.surface.warmIvory,
            borderRadius: 24,
            padding: 22,
            ...shadows.sm,
          }}
        >
          <Text
            style={{
              color: colors.text.secondary,
              fontSize: typography.size.lg,
              lineHeight: 28,
              fontWeight: typography.weight.semibold,
              textAlign: "center",
            }}
          >
            Begin with calm. Continue with steadiness. Let the app remove friction so the
            reading itself can remain the focus.
          </Text>
        </View>
      </ScrollView >
    </View >
  );
}
