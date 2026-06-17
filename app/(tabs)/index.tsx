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

import { shadows, typography } from "../../constants/theme";
import { BOOK_TITLE } from "../../data/book";
import {
  LANGUAGES,
  getVolumeByLanguageAndId,
  getVolumeDisplayTitle,
  shouldShowVolumeLabel,
} from "../../data/languages";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useVolumeProgress } from "../../hooks/useVolumeProgress";
import {
  getCurrentPlanDay,
  getPlanDayProgress,
  getPlanItemForDay,
  getPlanItemNavigationTarget,
} from "../../lib/plan-resolver";
import {
  buildReaderHref,
  getCurrentSection,
  getResumeNavigationTarget,
} from "../../lib/section-resolver";

const SELECTED_CHIP_FILL = "#F1E0A4";
const SELECTED_CHIP_TEXT = "#101815";

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
  const { colors } = useAppTheme();
  const volume = getVolumeByLanguageAndId(languageId, volumeId);
  const { progress } = useVolumeProgress(volumeId, languageId);

  const currentSection =
    getCurrentSection(volume, progress) ?? volume.sections[0];
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
        numberOfLines={2}
      >
        {currentSection.title}
      </Text>

    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useAppTheme();
  const isAnimatingRef = useRef(false);
  const lastLanguageIdRef = useRef<string | null>(null);
  const slideX = useSharedValue(0);
  const fade = useSharedValue(1);

  const { currentLanguage, currentLanguageId, switchLanguage } = useCurrentLanguage();
  const { currentVolumeId, switchVolume } = useCurrentVolume(currentLanguageId);
  const currentVolume = getVolumeByLanguageAndId(currentLanguageId, currentVolumeId);
  const { progress } = useVolumeProgress(currentVolumeId, currentLanguageId);
  const { activePlan } = useReadingPlan(currentVolumeId, currentLanguageId);

  const [displayVolumeId, setDisplayVolumeId] = useState(currentVolumeId);

  const currentPlanDay = activePlan
    ? getCurrentPlanDay(currentVolume, activePlan, progress)
    : 1;
  const currentPlanProgress = activePlan
    ? getPlanDayProgress(currentVolume, activePlan, progress)
    : 0;
  const todayPlanItem = activePlan
    ? getPlanItemForDay(activePlan, currentPlanDay)
    : undefined;
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
  const { progress: currentDisplayProgress } = useVolumeProgress(
    currentDisplayVolume.id,
    currentLanguageId,
  );
  const isDark = resolvedTheme === "dark";
  const homeBackground = isDark ? "#0B100D" : colors.surface.lightCream;
  const primaryCardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const quietCardBackground = isDark ? "rgba(26, 37, 32, 0.58)" : colors.surface.warmIvory;
  const darkCardBorder = isDark ? "rgba(241, 224, 164, 0.08)" : "transparent";
  const quietCardBorder = isDark ? "rgba(255, 255, 255, 0.05)" : "transparent";
  const darkGoldWash = isDark ? "rgba(241, 224, 164, 0.12)" : "rgba(201, 169, 97, 0.12)";

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
    <View style={{ flex: 1, backgroundColor: homeBackground }}>
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
                      ? isDark
                        ? colors.surface.softBeige
                        : SELECTED_CHIP_FILL
                      : colors.surface.warmIvory,
                    borderWidth: 1.5,
                    borderColor: isActive ? SELECTED_CHIP_FILL : colors.surface.softBeige,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 18,
                    opacity: pressed ? 0.92 : 1,
                    ...shadows.sm,
                  })}
                >
                  <Text
                    style={{
                      color: isActive
                        ? isDark
                          ? SELECTED_CHIP_FILL
                          : SELECTED_CHIP_TEXT
                        : colors.text.tertiary,
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
                onPress={() =>
                  router.push(
                    buildReaderHref(
                      currentLanguageId,
                      displayVolumeId,
                      getResumeNavigationTarget(
                        currentDisplayVolume,
                        currentDisplayProgress,
                      ),
                    ) as any,
                  )
                }
                style={{
                  flex: 1,
                  borderRadius: 999,
                  backgroundColor: colors.secondary.lightGold,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.primary.deepGreen,
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
              backgroundColor: primaryCardBackground,
              borderRadius: 24,
              borderWidth: isDark ? 1 : 0,
              borderColor: darkCardBorder,
              padding: 20,
              gap: 16,
              ...shadows.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: isDark
                    ? "rgba(241, 224, 164, 0.14)"
                    : colors.surface.softBeige,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="calendar"
                  size={26}
                  color={colors.secondary.mutedGold}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.secondary.mutedGold,
                    fontSize: typography.size.xs,
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
                    marginTop: 2,
                  }}
                >
                  {activePlan.title}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/plans/" as any)}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: darkGoldWash,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.secondary.mutedGold}
                />
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: isDark
                  ? "rgba(241, 224, 164, 0.08)"
                  : "rgba(201, 169, 97, 0.10)",
                borderRadius: 16,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: typography.size["3xl"],
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  Day {currentPlanDay}
                </Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: colors.secondary.mutedGold,
                      fontSize: typography.size["2xl"],
                      fontWeight: typography.weight.extrabold,
                    }}
                  >
                    {currentPlanProgress}%
                  </Text>
                  <Text
                    style={{
                      color: colors.text.muted,
                      fontSize: typography.size.sm,
                      marginTop: 2,
                    }}
                  >
                    of {activePlan.totalDays} days
                  </Text>
                </View>
              </View>
              <View
                style={{
                  height: 10,
                  backgroundColor: isDark
                    ? "rgba(201, 169, 97, 0.12)"
                    : "rgba(201, 169, 97, 0.18)",
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${currentPlanProgress}%`,
                    backgroundColor: colors.secondary.mutedGold,
                    borderRadius: 5,
                  }}
                />
              </View>
            </View>

            {todayPlanItem ? (
              <Pressable
                onPress={() =>
                  router.push(
                    buildReaderHref(
                      currentLanguageId,
                      currentVolumeId,
                      getPlanItemNavigationTarget(currentVolume, todayPlanItem),
                    ) as any,
                  )
                }
                style={({ pressed }) => ({
                  borderRadius: 999,
                  backgroundColor: isDark
                    ? colors.surface.softBeige
                    : colors.secondary.lightGold,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: isDark
                      ? colors.secondary.lightGold
                      : colors.primary.deepGreen,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.extrabold,
                  }}
                >
                  Continue: {todayPlanItem.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/plans/" as any)}
            style={({ pressed }) => ({
              backgroundColor: quietCardBackground,
              borderRadius: 16,
              borderWidth: isDark ? 1 : 0,
              borderColor: quietCardBorder,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              opacity: pressed ? 0.85 : 1,
              ...(isDark ? {} : shadows.sm),
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark
                  ? "rgba(241, 224, 164, 0.10)"
                  : "rgba(201, 169, 97, 0.14)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.secondary.mutedGold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.bold,
                }}
              >
                Want structure? Try a reading plan
              </Text>
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.sm,
                  marginTop: 2,
                }}
              >
                1-week, 3-week, and flexible plans
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
        )}

        <View
          style={{
            backgroundColor: primaryCardBackground,
            borderRadius: 24,
            borderWidth: isDark ? 1 : 0,
            borderColor: darkCardBorder,
            padding: 20,
            gap: 16,
            ...shadows.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: isDark
                  ? "rgba(241, 224, 164, 0.14)"
                  : colors.surface.softBeige,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="book"
                size={26}
                color={colors.secondary.mutedGold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.secondary.mutedGold,
                  fontSize: typography.size.xs,
                  fontWeight: typography.weight.bold,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                About
              </Text>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size.xl,
                  fontWeight: typography.weight.extrabold,
                  marginTop: 2,
                }}
              >
                {currentLanguageId === "roman-urdu" ? "Shifa Shareef" : "شفاء شریف"}
              </Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.base,
                lineHeight: 24,
              }}
            >
              {currentLanguageId === "roman-urdu"
                ? "Shifa Shareef Qazi Iyaz رحمہ اللہ ki mashoor kitab 'الشفا بتعريف حقوق المصطفى' ka Urdu tarjama hai. Yeh kitab Huzoor ﷺ ki shaan-o-azmat, fazail, mojizaat, aur aap ke huqooq par mushtamil hai."
                : "شفاء شریف قاضی عیاض رحمہ اللہ کی مشہور کتاب 'الشفا بتعريف حقوق المصطفى' کا اردو ترجمہ ہے۔ یہ کتاب حضور ﷺ کی شان و عظمت، فضائل، معجزات، اور آپ کے حقوق پر مشتمل ہے۔"}
            </Text>
            <Text
              style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                lineHeight: 22,
              }}
            >
              {currentLanguageId === "roman-urdu"
                ? "Is kitab mein Quran aur Hadees se sabut ke saath Rasool-e-Paak ﷺ ki azmat, akhlaaq-e-hasana, mojizaat aur Ummat par aap ke huqooq ka tafseel se zikr hai."
                : "اس کتاب میں قرآن اور حدیث سے ثبوت کے ساتھ رسول پاک ﷺ کی عظمت، اخلاق حسنہ، معجزات اور امت پر آپ کے حقوق کا تفصیل سے ذکر ہے۔"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
