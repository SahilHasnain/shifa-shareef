import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingProgress } from "../../hooks/useReadingProgress";

type FilterType = "all" | "unread" | "in-progress" | "short";

export default function SectionsScreen() {
  const router = useRouter();
  const { currentVolume, currentVolumeId } = useCurrentVolume();
  const { progress } = useReadingProgress(currentVolumeId);
  const [filter, setFilter] = useState<FilterType>("all");

  const getSectionStatus = (section: (typeof currentVolume.sections)[number]) => {
    if (!progress) return "unread";

    const { lastPage } = progress;

    if (lastPage > section.endPage) return "completed";
    if (lastPage >= section.startPage && lastPage <= section.endPage) return "in-progress";
    return "unread";
  };

  const filteredSections = currentVolume.sections.filter((section) => {
    if (filter === "all") return true;
    if (filter === "short") return section.estimatedMinutes <= 25;
    return getSectionStatus(section) === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "in-progress", label: "In Progress" },
    { key: "short", label: "Short Reads" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ padding: 20, paddingBottom: 18 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            Sections
          </Text>
          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.md,
              lineHeight: 22,
              marginTop: 6,
            }}
          >
            {currentVolume.title} sections for steady reading and quick continuation
          </Text>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 18 }}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={({ pressed }) => ({
                backgroundColor:
                  filter === f.key ? colors.secondary.warmGold : colors.surface.warmIvory,
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 20,
                opacity: pressed ? 0.9 : 1,
                ...shadows.sm,
              })}
            >
              <Text
                style={{
                  color: filter === f.key ? colors.primary.deepGreen : colors.text.tertiary,
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.bold,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Sections List */}
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {filteredSections.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface.warmIvory,
                borderRadius: 24,
                padding: 36,
                alignItems: "center",
                gap: 12,
                ...shadows.sm,
              }}
            >
              <Ionicons name="book-outline" size={52} color={colors.text.light} />
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.semibold,
                }}
              >
                No sections match this filter
              </Text>
            </View>
          ) : (
            filteredSections.map((section) => {
              const isCurrent =
                progress &&
                progress.lastPage >= section.startPage &&
                progress.lastPage <= section.endPage;
              const status = getSectionStatus(section);

              return (
                <Pressable
                  key={section.id}
                  onPress={() =>
                    router.push(`/reader/${currentVolumeId}/${section.startPage}` as any)
                  }
                  style={({ pressed }) => ({
                    backgroundColor: isCurrent
                      ? colors.secondary.paleGold
                      : colors.surface.warmIvory,
                    borderRadius: 24,
                    padding: 20,
                    gap: 14,
                    opacity: pressed ? 0.95 : 1,
                    ...shadows.md,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: isCurrent ? colors.primary.deepGreen : colors.text.primary,
                        fontSize: typography.size.xl,
                        fontWeight: typography.weight.extrabold,
                        flex: 1,
                        lineHeight: 26,
                      }}
                    >
                      {section.title}
                    </Text>
                    <View
                      style={{
                        backgroundColor: isCurrent
                          ? colors.primary.deepGreen
                          : "rgba(201, 169, 97, 0.12)",
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: isCurrent
                            ? "#FFFFFF"
                            : colors.secondary.mutedGold,
                          fontSize: typography.size.sm,
                          fontWeight: typography.weight.bold,
                        }}
                      >
                        {section.estimatedMinutes} min
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <Text
                      style={{
                        color: isCurrent ? colors.primary.forestGreen : colors.text.tertiary,
                        fontSize: typography.size.base,
                        fontWeight: typography.weight.semibold,
                      }}
                    >
                      Pages {section.startPage}-{section.endPage}
                    </Text>
                    {status === "completed" && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={isCurrent ? colors.primary.deepGreen : colors.accent.success}
                        />
                        <Text
                          style={{
                            color: isCurrent ? colors.primary.deepGreen : colors.accent.success,
                            fontSize: typography.size.sm,
                            fontWeight: typography.weight.bold,
                          }}
                        >
                          Completed
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={{
                      color: isCurrent ? colors.primary.forestGreen : colors.text.muted,
                      fontSize: typography.size.base,
                      lineHeight: 22,
                    }}
                  >
                    {section.description}
                  </Text>

                  {isCurrent && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                        marginTop: 4,
                      }}
                    >
                      <Ionicons name="book" size={17} color={colors.primary.deepGreen} />
                      <Text
                        style={{
                          color: colors.primary.deepGreen,
                          fontSize: typography.size.sm,
                          fontWeight: typography.weight.bold,
                        }}
                      >
                        Currently reading
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
