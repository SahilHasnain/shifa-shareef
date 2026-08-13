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
import { useVolumeProgress } from "../../hooks/useVolumeProgress";
import {
  buildReaderHref,
  getCurrentSection,
  getResumeNavigationTarget,
} from "../../lib/section-resolver";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;
  const number = parseInt(value, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  const clamp = (part: number) =>
    Math.max(0, Math.min(255, Math.round(part)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

function interpolateColor(from: string, to: string, amount: number) {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  return rgbToHex([
    fromRgb[0] + (toRgb[0] - fromRgb[0]) * amount,
    fromRgb[1] + (toRgb[1] - fromRgb[1]) * amount,
    fromRgb[2] + (toRgb[2] - fromRgb[2]) * amount,
  ]);
}

function OpenBookFab({
  size,
  colors,
  href,
}: {
  size: number;
  colors: ReturnType<typeof useAppTheme>["colors"];
  href: string;
}) {
  const steps = 10;
  const fabRouter = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open book"
      onPress={() => fabRouter.push(href as any)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Array.from({ length: steps }).map((_, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: size / steps,
              transform: [{ translateY: (size / steps) * index }],
              backgroundColor: interpolateColor(colors.secondary.mutedGold, colors.secondary.warmGold, index / (steps - 1)),
            }}
          />
        ))}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="book" size={Math.round(size * 0.44)} color="#1B1206" />
        </View>
      </View>
    </Pressable>
  );
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

  const [displayVolumeId, setDisplayVolumeId] = useState(currentVolumeId);
  const [langMenuVisible, setLangMenuVisible] = useState(false);

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
                ? 'Ash-Shifa, written by Qadi Iyad رحمۃ اللہ تعالیٰ علیہ, is a timeless work on the status, rights, and love of the Noble Prophet ﷺ.'
                : currentLanguageId === "roman-urdu"
                  ? 'Ash-Shifa Qazi Iyaz رحمۃ اللہ تعالیٰ علیہ ki azeem tasneef hai jo Huzoor ﷺ ki shaan, huqooq aur muhabbat ko samjhati hai.'
                  : 'الشفا قاضی عیاض رحمۃ اللہ تعالیٰ علیہ کی عظیم تصنیف ہے، جو حضور ﷺ کی شان، حقوق اور محبت کو سمجھاتی ہے۔'}
            </Text>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size.sm,
                lineHeight: 22,
              }}
            >
              {currentLanguageId === "english"
                ? 'Across four sections, it explores the Prophet\'s ﷺ virtues, miracles, rights, character, and the adab of mentioning him.'
                : currentLanguageId === "roman-urdu"
                  ? 'Chaar hisson mein Huzoor ﷺ ki fazilat, mojizaat, huqooq, seerat aur zikr ke adab bayan kiye gaye hain.'
                  : 'چار حصوں میں حضور ﷺ کی فضیلت، معجزات، حقوق، سیرت اور ذکر کے آداب بیان کیے گئے ہیں۔'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {!isAnimatingRef.current ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 16,
            bottom: insets.bottom - 30,
            zIndex: 50,
          }}
        >
          <OpenBookFab
            size={56}
            colors={colors}
            href={buildReaderHref(
              currentLanguageId,
              displayVolumeId,
              getResumeNavigationTarget(
                currentDisplayVolume,
                currentDisplayProgress,
              ),
            )}
          />
        </View>
      ) : null}
    </View>
  );
}
