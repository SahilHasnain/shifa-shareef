import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingProgress } from "../../hooks/useReadingProgress";

export default function PlansScreen() {
    const router = useRouter();
    const { currentVolume, currentVolumeId } = useCurrentVolume();
    const { progress } = useReadingProgress(currentVolumeId);
    const { activePlan, startPlan, clearPlan } = useReadingPlan(currentVolumeId);
    const currentPage = progress?.lastPage ?? 1;
    const readingPlans = currentVolume.plans;
    const currentPlanDay = activePlan
        ? activePlan.items.find(
            (item) => currentPage >= item.startPage && currentPage <= item.endPage,
        )?.day ?? 1
        : 1;
    const currentPlanProgress = activePlan
        ? Math.round((currentPlanDay / activePlan.totalDays) * 100)
        : 0;

    const handleSelectPlan = (planId: string) => {
        if (activePlan) {
            Alert.alert(
                "Active Plan",
                "You already have an active plan. Do you want to switch to a new plan?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Switch Plan",
                        style: "destructive",
                        onPress: async () => {
                            await startPlan(planId);
                            router.back();
                        },
                    },
                ],
            );
        } else {
            Alert.alert(
                "Start Plan",
                "Ready to begin this reading plan?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Start",
                        onPress: async () => {
                            await startPlan(planId);
                            router.back();
                        },
                    },
                ],
            );
        }
    };

    const handleClearPlan = () => {
        Alert.alert(
            "Clear Plan",
            "Are you sure you want to stop your current reading plan?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        await clearPlan();
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => ({
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.surface.warmIvory,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.7 : 1,
                            ...shadows.sm,
                        })}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.primary.deepGreen} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                color: colors.text.primary,
                                fontSize: typography.size["4xl"],
                                fontWeight: typography.weight.extrabold,
                            }}
                        >
                            {currentVolume.title} Plans
                        </Text>
                    </View>
                </View>

                <Text
                    style={{
                        color: colors.text.tertiary,
                        fontSize: typography.size.md,
                        lineHeight: 22,
                    }}
                >
                    Choose a plan that matches your pace. Consistency matters more than speed.
                </Text>

                {/* Active Plan Card */}
                {activePlan && (
                    <View
                        style={{
                            backgroundColor: colors.primary.deepGreen,
                            borderRadius: 24,
                            padding: 20,
                            gap: 14,
                            ...shadows.lg,
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
                                        color: colors.text.light,
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
                                        color: "#FFF9EA",
                                        fontSize: typography.size["2xl"],
                                        fontWeight: typography.weight.extrabold,
                                        marginTop: 4,
                                    }}
                                >
                                    {activePlan.title}
                                </Text>
                            </View>
                            <Pressable
                                onPress={handleClearPlan}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    backgroundColor: "rgba(220, 53, 69, 0.2)",
                                    opacity: pressed ? 0.7 : 1,
                                })}
                            >
                                <Text
                                    style={{
                                        color: "#FFB3BA",
                                        fontSize: typography.size.sm,
                                        fontWeight: typography.weight.bold,
                                    }}
                                >
                                    Clear
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
                                        color: "#C6D4CB",
                                        fontSize: typography.size.base,
                                    }}
                                >
                                    Day {currentPlanDay} of {activePlan.totalDays}
                                </Text>
                                <Text
                                    style={{
                                        color: colors.secondary.lightGold,
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
                                    backgroundColor: "rgba(255, 249, 234, 0.2)",
                                    borderRadius: 4,
                                    overflow: "hidden",
                                }}
                            >
                                <View
                                    style={{
                                        height: "100%",
                                        width: `${currentPlanProgress}%`,
                                        backgroundColor: colors.secondary.lightGold,
                                        borderRadius: 4,
                                    }}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* Available Plans */}
                <View style={{ gap: 14 }}>
                    {readingPlans.map((plan) => {
                        const isActive = activePlan?.id === plan.id;

                        return (
                            <Pressable
                                key={plan.id}
                                onPress={() => !isActive && handleSelectPlan(plan.id)}
                                disabled={isActive}
                                style={({ pressed }) => ({
                                    backgroundColor: isActive ? "#E8F5E9" : colors.surface.warmIvory,
                                    borderRadius: 24,
                                    padding: 20,
                                    gap: 14,
                                    opacity: isActive ? 0.7 : pressed ? 0.8 : 1,
                                    ...shadows.md,
                                })}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: 12,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                color: colors.text.primary,
                                                fontSize: typography.size["2xl"],
                                                fontWeight: typography.weight.extrabold,
                                            }}
                                        >
                                            {plan.title}
                                        </Text>
                                        {isActive && (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    marginTop: 6,
                                                }}
                                            >
                                                <Ionicons name="checkmark-circle" size={16} color={colors.accent.success} />
                                                <Text
                                                    style={{
                                                        color: colors.accent.success,
                                                        fontSize: typography.size.sm,
                                                        fontWeight: typography.weight.bold,
                                                    }}
                                                >
                                                    Currently Active
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View
                                        style={{
                                            backgroundColor: "rgba(201, 169, 97, 0.12)",
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: colors.secondary.mutedGold,
                                                fontSize: typography.size.sm,
                                                fontWeight: typography.weight.bold,
                                            }}
                                        >
                                            {plan.totalDays} days
                                        </Text>
                                    </View>
                                </View>

                                <Text
                                    style={{
                                        color: colors.text.muted,
                                        fontSize: typography.size.base,
                                        lineHeight: 21,
                                    }}
                                >
                                    {plan.description}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 16,
                                        paddingTop: 4,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Ionicons name="book-outline" size={18} color={colors.text.subtle} />
                                        <Text
                                            style={{
                                                color: colors.text.tertiary,
                                                fontSize: typography.size.sm,
                                                fontWeight: typography.weight.semibold,
                                            }}
                                        >
                                            {plan.pagesPerDay} pages/day
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Ionicons name="time-outline" size={18} color={colors.text.subtle} />
                                        <Text
                                            style={{
                                                color: colors.text.tertiary,
                                                fontSize: typography.size.sm,
                                                fontWeight: typography.weight.semibold,
                                            }}
                                        >
                                            ~{Math.round(plan.pagesPerDay * 0.5)} min/day
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Info Card */}
                <View
                    style={{
                        backgroundColor: colors.surface.warmIvory,
                        borderRadius: 22,
                        padding: 20,
                        gap: 10,
                        ...shadows.sm,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.secondary.mutedGold} />
                        <Text
                            style={{
                                color: colors.text.primary,
                                fontSize: typography.size.lg,
                                fontWeight: typography.weight.bold,
                            }}
                        >
                            About Plans
                        </Text>
                    </View>
                    <Text
                        style={{
                            color: colors.text.muted,
                            fontSize: typography.size.base,
                            lineHeight: 21,
                        }}
                    >
                        Plans help you build consistency. Choose one that feels sustainable. You can always
                        switch or read at your own pace without a plan.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
