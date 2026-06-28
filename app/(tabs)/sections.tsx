import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { typography } from "../../constants/theme";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useVolumeProgress } from "../../hooks/useVolumeProgress";
import {
  buildReaderHref,
  getSectionNavigationTarget,
  getSectionStatus,
} from "../../lib/section-resolver";

export default function TopicsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentLanguageId } = useCurrentLanguage();
  const { currentVolume, currentVolumeId } = useCurrentVolume(currentLanguageId);
  const { progress } = useVolumeProgress(currentVolumeId, currentLanguageId);

  const handleSectionPress = (section: (typeof currentVolume.sections)[number]) => {
    const target = getSectionNavigationTarget(currentVolume, section);
    router.push(buildReaderHref(currentLanguageId, currentVolumeId, target) as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 5, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, gap: 2, paddingTop: 20 }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.size["3xl"], fontWeight: typography.weight.extrabold, marginBottom: 8 }}>Topics</Text>
          {currentVolume.sections.map((section, index) => {
            const status = getSectionStatus(currentVolume, section, progress);
            const isCurrent = status === "current";
            const isCompleted = status === "completed";

            return (
              <Pressable
                key={section.id}
                onPress={() => handleSectionPress(section)}
                style={({ pressed }) => ({
                  backgroundColor: isCurrent ? "#F8F0D8" : "transparent",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: isCurrent
                      ? colors.primary.deepGreen
                      : isCompleted
                        ? colors.accent.success
                        : "rgba(23, 61, 49, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: isCurrent ? "#FFFFFF" : colors.text.primary,
                        fontSize: typography.size.xl,
                        fontWeight: typography.weight.extrabold,
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        fontSize: typography.size.lg,
                        fontWeight: typography.weight.bold,
                        lineHeight: 22,
                      }}
                    >
                      {section.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.size.sm,
                        fontWeight: typography.weight.medium,
                      }}
                    >
                      {section.estimatedMinutes >= 60
                        ? `${Math.floor(section.estimatedMinutes / 60)}:${String(section.estimatedMinutes % 60).padStart(2, "0")}`
                        : `${section.estimatedMinutes} min`}
                    </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text.tertiary}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
