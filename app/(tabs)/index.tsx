import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
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
  const [langMenuVisible, setLangMenuVisible] = useState(false);

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
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.08)" : "transparent";
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
          <Pressable
            onPress={() => setLangMenuVisible(true)}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              backgroundColor: colors.surface.warmIvory,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isDark ? "rgba(241, 224, 164, 0.12)" : "rgba(23,61,49,0.08)",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              ...shadows.sm,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Ionicons name="language" size={16} color={colors.primary.sageGreen} style={{ marginRight: 6 }} />
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.extrabold,
                  marginRight: 5,
                }}
              >
                {currentLanguage.title}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={colors.text.tertiary}
              />
            </View>
          </Pressable>

          <Modal visible={langMenuVisible} transparent animationType="fade" onRequestClose={() => setLangMenuVisible(false)}>
            <View style={{ flex: 1 }}>
              <Pressable
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.4)" }}
                onPress={() => setLangMenuVisible(false)}
              />
              <View style={{ position: "absolute", top: 150, left: 20, width: 220, backgroundColor: cardBackground, borderRadius: 20, borderWidth: isDark ? 1 : 0, borderColor: cardBorderColor, overflow: "hidden", ...shadows.lg }}>
                <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(241, 224, 164, 0.1)" : "rgba(23,61,49,0.08)" }}>
                  <Text style={{ fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.secondary.mutedGold, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Select Language
                  </Text>
                </View>
                {LANGUAGES.map((language) => {
                  const isActive = language.id === currentLanguageId;
                  return (
                    <Pressable
                      key={language.id}
                      onPress={() => {
                        switchLanguage(language.id);
                        setLangMenuVisible(false);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? (isDark ? "rgba(241, 224, 164, 0.05)" : "rgba(23,61,49,0.03)") : isActive ? (isDark ? "rgba(90, 140, 120, 0.1)" : "rgba(90, 140, 120, 0.06)") : "transparent",
                      })}
                    >
                      <View style={{ minHeight: 52, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 10 }}>
                        <Text
                          style={{
                            color: isActive ? colors.primary.sageGreen : colors.text.primary,
                            fontSize: typography.size.base,
                            fontWeight: isActive ? typography.weight.extrabold : typography.weight.semibold,
                          }}
                        >
                          {language.title}
                        </Text>
                        {language.nativeTitle !== language.title && (
                          <Text
                            style={{
                              color: colors.text.tertiary,
                              fontSize: typography.size.sm,
                              fontWeight: typography.weight.medium,
                              marginTop: 3,
                            }}
                          >
                            {language.nativeTitle}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Modal>
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
                {currentLanguageId === "roman-urdu" || currentLanguageId === "english" ? "Shifa Shareef" : "شفاء شریف"}
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
              {currentLanguageId === "english"
                ? 'For more than eight centuries, Ash-Shifa has been regarded as the most renowned and authoritative book on the status, rank, and rights of the Noble Prophet Sayyiduna Muhammad Mustafa ﷺ. This magnificent work was authored by the eminent Maliki scholar and jurist Qadi Iyad (رحمۃ اللہ تعالیٰ علیہ) (544 AH / 1149 CE). It is not merely a book; rather, it is a great legacy filled with love for the Prophet ﷺ, teaching every Muslim what beliefs they should hold about him, how they should love him, and with what reverence and respect they should mention him.'
                : currentLanguageId === "roman-urdu"
                  ? 'Aath sadiyon se bhi zyada arsay se "Ash-Shifa" Huzoor Nabi-e-Kareem Sayyiduna Muhammad Mustafa ﷺ ki shaan, martabay aur huqooq par likhi gayi sab se mashhoor aur mu\'tabar kitab mani jati hai. Is azeem kitab ko buzurg Maliki alim aur faqeeh Qazi Iyaz رحمۃ اللہ تعالیٰ علیہ (544 Hijri / 1149 Iswi) ne tasneef farmaya. Yeh sirf ek kitab nahin, balkeh Huzoor ﷺ ki muhabbat se bharpur ek azeem virsa hai jo har Musalman ko yeh sikhata hai ke Aap ﷺ ke bare mein kya aqeedah rakhna chahiye, kis tarah muhabbat karni chahiye aur kis adab ke sath Aap ﷺ ka zikr karna chahiye.'
                  : 'آٹھ صدیوں سے بھی زیادہ عرصے سے "الشفا" حضور نبیِ کریم سیدنا محمد مصطفیٰ ﷺ کی شان، مرتبے اور حقوق پر لکھی گئی سب سے مشہور اور معتبر کتاب مانی جاتی ہے۔ اس عظیم کتاب کو بزرگ مالکی عالم اور فقیہ قاضی عیاض رحمۃ اللہ تعالیٰ علیہ (544 ہجری / 1149 عیسوی) نے تصنیف فرمایا۔ یہ صرف ایک کتاب نہیں، بلکہ حضور ﷺ کی محبت سے بھرپور ایک عظیم ورثہ ہے جو ہر مسلمان کو یہ سکھاتا ہے کہ آپ ﷺ کے بارے میں کیا عقیدہ رکھنا چاہیے، کس طرح محبت کرنی چاہیے اور کس ادب کے ساتھ آپ ﷺ کا ذکر کرنا چاہیے۔'}
            </Text>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.sm,
                lineHeight: 22,
              }}
            >
              {currentLanguageId === "english"
                ? 'This blessed work is divided into four sections. The first section presents the exalted status of the Prophet ﷺ, the miracles granted to him by Allah Almighty, and his virtues, all in the light of the Holy Qur\'an and the Prophetic traditions. The second section explains the obligations of the Muslim community towards the Prophet ﷺ, namely to have complete faith in him, to love him above all else, to honor and revere him, and to frequently send blessings and salutations upon him. The third section discusses, in a clear and accessible manner, important matters relating to the infallibility of the Prophets and the human aspects of the Prophet\'s ﷺ life. The final section addresses the seriousness of showing disrespect towards the Prophet ﷺ, the relevant Islamic rulings, and the boundaries of reverence and proper conduct.'
                : currentLanguageId === "roman-urdu"
                  ? 'Yeh mubarak kitab chaar hisson mein taqseem ki gayi hai. Pehle hisse mein Qur\'an-e-Kareem aur Ahadees ki roshni mein Huzoor ﷺ ki buland shaan, Allah Ta\'ala ki taraf se ata kiye gaye mojizaat aur Aap ﷺ ki fazilat bayan ki gayi hai. Dusre hisse mein Ummat ke farz bataye gaye hain, yani Huzoor ﷺ par kamil imaan lana, sab se zyada Aap ﷺ se muhabbat karna, Aap ﷺ ki ta\'zeem aur adab karna, aur kasrat se durood-o-salaam pesh karna. Teesre hisse mein Anbiya-e-Kiram ki masoomiyat aur Huzoor ﷺ ki insani zindagi se mutaalliq aham baatein aasaan andaaz mein samjhayi gayi hain. Aakhri hissa Huzoor ﷺ ki bargah mein be-adabi ki sangini, us ke shar\'i ahkaam aur ta\'zeem-o-adab ki hudood ko wazeh karta hai.'
                  : 'یہ مبارک کتاب چار حصوں میں تقسیم کی گئی ہے۔ پہلے حصے میں قرآنِ کریم اور احادیثِ مبارکہ کی روشنی میں حضور ﷺ کی بلند شان، اللہ تعالیٰ کی طرف سے عطا کیے گئے معجزات اور آپ ﷺ کی فضیلت بیان کی گئی ہے۔ دوسرے حصے میں امت کے فرائض بیان کیے گئے ہیں، یعنی حضور ﷺ پر کامل ایمان لانا، سب سے بڑھ کر آپ ﷺ سے محبت کرنا، آپ ﷺ کی تعظیم اور ادب بجا لانا، اور کثرت سے درود و سلام پیش کرنا۔ تیسرے حصے میں انبیائے کرام علیہم السلام کی عصمت اور حضور ﷺ کی بشری زندگی سے متعلق اہم باتوں کو آسان انداز میں بیان کیا گیا ہے۔ آخری حصے میں حضور ﷺ کی بارگاہ میں بے ادبی کی سنگینی، اس کے شرعی احکام اور تعظیم و ادب کی حدود کو واضح کیا گیا ہے۔'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
