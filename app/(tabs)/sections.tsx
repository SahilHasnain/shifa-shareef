import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../../constants/theme";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingProgress } from "../../hooks/useReadingProgress";

export default function SectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentVolume, currentVolumeId } = useCurrentVolume();
  const { progress } = useReadingProgress(currentVolumeId);

  const getSectionStatus = (section: (typeof currentVolume.sections)[number]) => {
    if (!progress) return "unread";
    const { lastPage } = progress;
    if (lastPage > section.endPage) return "completed";
    if (lastPage >= section.startPage && lastPage <= section.endPage) return "current";
    return "unread";
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 5, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            Sections
          </Text>
        </View>

        {/* Sections List */}
        <View style={{ paddingHorizontal: 20, gap: 2 }}>
          {currentVolume.sections.map((section, index) => {
            const status = getSectionStatus(section);
            const isCurrent = status === "current";
            const isCompleted = status === "completed";

            return (
              <Pressable
                key={section.id}
                onPress={() =>
                  router.push(`/reader/${currentVolumeId}/${section.startPage}` as any)
                }
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
                {/* Section Number */}
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

                {/* Section Info */}
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.size.sm,
                        fontWeight: typography.weight.medium,
                      }}
                    >
                      Pages {section.startPage}-{section.endPage}
                    </Text>
                    <View
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: colors.text.tertiary,
                      }}
                    />
                    <Text
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.size.sm,
                        fontWeight: typography.weight.medium,
                      }}
                    >
                      {section.estimatedMinutes} min
                    </Text>
                  </View>
                </View>

                {/* Arrow */}
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
