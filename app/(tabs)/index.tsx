import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import { BOOK_TITLE, SECTIONS, TOTAL_PAGES } from "../../data/book";
import { getCurrentDayForPlan, getPlanProgress } from "../../data/plans";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingProgress } from "../../hooks/useReadingProgress";

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

export default function HomeScreen() {
  const router = useRouter();
  const { progress, isLoaded } = useReadingProgress();
  const { activePlan } = useReadingPlan();

  const currentPage = progress?.lastPage ?? 1;
  const currentSection =
    SECTIONS.find(
      (section) =>
        currentPage >= section.startPage && currentPage <= section.endPage,
    ) ?? SECTIONS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Continue Reading Card - Hero */}
        <View
          style={{
            backgroundColor: colors.primary.deepGreen,
            borderRadius: 28,
            padding: 24,
            gap: 14,
            ...shadows.lg,
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
          <Text
            style={{
              color: "#FFF9EA",
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
              lineHeight: 34,
            }}
          >
            {BOOK_TITLE}
          </Text>
          <Text
            style={{
              color: colors.secondary.paleGold,
              fontSize: typography.size.lg,
              fontWeight: typography.weight.semibold,
            }}
          >
            {currentSection.title}
          </Text>
          <Text
            style={{
              color: "#C8D5CD",
              fontSize: typography.size.md,
              lineHeight: 22,
            }}
          >
            Page {currentPage} of {TOTAL_PAGES}
          </Text>
          <Text
            style={{
              color: colors.text.light,
              fontSize: typography.size.sm,
            }}
          >
            {isLoaded ? formatLastRead(progress?.lastReadAt) : "Loading progress..."}
          </Text>
          <Pressable
            onPress={() => router.push(`/reader/${currentPage}`)}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 8,
              borderRadius: 999,
              backgroundColor: colors.secondary.lightGold,
              paddingHorizontal: 24,
              paddingVertical: 14,
              opacity: pressed ? 0.9 : 1,
              ...shadows.md,
            })}
          >
            <Text
              style={{
                color: colors.primary.deepGreen,
                fontSize: typography.size.md,
                fontWeight: typography.weight.extrabold,
              }}
            >
              Resume Reading
            </Text>
          </Pressable>
        </View>

        {/* Reading Plan Card */}
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
                  Day {getCurrentDayForPlan(activePlan, currentPage)} of {activePlan.totalDays}
                </Text>
                <Text
                  style={{
                    color: colors.secondary.mutedGold,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  {getPlanProgress(activePlan, currentPage)}%
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
                    width: `${getPlanProgress(activePlan, currentPage)}%`,
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
              backgroundColor: colors.surface.warmIvory,
              borderRadius: 24,
              padding: 20,
              gap: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.95 : 1,
              ...shadows.md,
            })}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size.xl,
                  fontWeight: typography.weight.extrabold,
                }}
              >
                Choose a Reading Plan
              </Text>
              <Text
                style={{
                  color: colors.text.muted,
                  fontSize: typography.size.base,
                  lineHeight: 21,
                }}
              >
                Build consistency with a structured plan
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.secondary.mutedGold} />
          </Pressable>
        )}

        {/* Today's Gentle Target */}
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
            onPress={() => router.push(`/reader/${currentPage}`)}
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

        {/* Reading Structure */}
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
          {SECTIONS.slice(0, 3).map((section) => (
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

        {/* Reflective Quote */}
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
      </ScrollView>
    </SafeAreaView>
  );
}
