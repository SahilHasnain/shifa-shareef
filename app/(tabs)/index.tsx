import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import { BOOK_TITLE } from "../../data/book";
import { VOLUMES, getCurrentSection } from "../../data/volumes";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
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
  const insets = useSafeAreaInsets();
  const { currentVolume, currentVolumeId, switchVolume } = useCurrentVolume();
  const { progress, isLoaded } = useReadingProgress(currentVolumeId);
  const { activePlan } = useReadingPlan(currentVolumeId);

  const currentPage = progress?.lastPage ?? 1;
  const currentSection =
    getCurrentSection(currentVolumeId, currentPage) ?? currentVolume.sections[0];
  const currentPlanDay = activePlan
    ? activePlan.items.find(
      (item) => currentPage >= item.startPage && currentPage <= item.endPage,
    )?.day ?? 1
    : 1;
  const currentPlanProgress = activePlan
    ? Math.round((currentPlanDay / activePlan.totalDays) * 100)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 5, paddingHorizontal: 20, gap: 20, paddingBottom: 40 }}
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
            contentContainerStyle={{ gap: 12, paddingRight: 8 }}
          >
            {VOLUMES.map((volume) => {
              const isActive = volume.id === currentVolumeId;

              return (
                <Pressable
                  key={volume.id}
                  onPress={() => switchVolume(volume.id)}
                  style={({ pressed }) => ({
                    backgroundColor: isActive
                      ? colors.secondary.warmGold
                      : colors.surface.warmIvory,
                    paddingHorizontal: 18,
                    paddingVertical: 11,
                    borderRadius: 20,
                    opacity: pressed ? 0.92 : 1,
                    ...shadows.sm,
                  })}
                >
                  <Text
                    style={{
                      color: isActive
                        ? colors.primary.deepGreen
                        : colors.text.tertiary,
                      fontSize: typography.size.base,
                      fontWeight: typography.weight.bold,
                    }}
                  >
                    {volume.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Continue Reading Card - Hero */}
        <View
          style={{
            backgroundColor: colors.primary.deepGreen,
            borderRadius: 28,
            padding: 24,
            gap: 18,
            ...shadows.lg,
          }}
        >
          <View style={{ gap: 14 }}>
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
                fontSize: typography.size["3xl"],
                fontWeight: typography.weight.extrabold,
                lineHeight: 32,
              }}
            >
              {currentVolume.title}
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
              Page {currentPage} of {currentVolume.totalPages}
            </Text>
            <Text
              style={{
                color: colors.text.light,
                fontSize: typography.size.sm,
              }}
            >
              {isLoaded ? formatLastRead(progress?.lastReadAt) : "Loading progress..."}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/reader/${currentVolumeId}/${currentPage}` as any)}
            style={{
              alignSelf: "flex-start",
              marginTop: 4,
              borderRadius: 999,
              backgroundColor: "#F0E1A7",
              paddingHorizontal: 20,
              paddingVertical: 12,
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
              }}
            >
              <Text
                style={{
                  color: colors.secondary.mutedGold,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.bold,
                }}
              >
                7-day, 21-day, and steady daily options
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
            onPress={() => router.push(`/reader/${currentVolumeId}/${currentPage}` as any)}
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
    </View>
  );
}
