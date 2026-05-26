import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import { getVolumeDisplayTitle, shouldShowVolumeLabel } from "../../data/languages";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingProgress } from "../../hooks/useReadingProgress";

export default function PlansScreen() {
    const router = useRouter();
    const { currentLanguage, currentLanguageId } = useCurrentLanguage();
    const { currentVolume, currentVolumeId } = useCurrentVolume(currentLanguageId);
    const { progress } = useReadingProgress(currentVolumeId, currentLanguageId);
    const { activePlan, startPlan, clearPlan } = useReadingPlan(
        currentVolumeId,
        currentLanguageId,
    );
    const showVolumeLabel = shouldShowVolumeLabel(currentLanguageId);
    const currentVolumeDisplayTitle = getVolumeDisplayTitle(
        currentLanguageId,
        currentVolumeId,
        currentVolume.title,
    );
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
                            {showVolumeLabel
                                ? `${currentLanguage.title} • ${currentVolumeDisplayTitle} Plans`
                                : `${currentLanguage.title} Plans`}
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
                        const firstItem = plan.items[0];

                        return (
                            <View
                                key={plan.id}
                                style={{
                                    backgroundColor: colors.surface.warmIvory,
                                    borderRadius: 24,
                                    padding: 18,
                                    gap: 8,
                                    ...shadows.md,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text.primary,
                                        fontSize: typography.size.xl,
                                        fontWeight: typography.weight.extrabold,
                                    }}
                                >
                                    {plan.title}
                                </Text>

                                <Text
                                    style={{
                                        color: colors.text.muted,
                                        fontSize: typography.size.base,
                                        lineHeight: 22,
                                    }}
                                >
                                    {plan.description}
                                </Text>

                                <Text
                                    style={{
                                        color: colors.secondary.mutedGold,
                                        fontSize: typography.size.xs,
                                        fontWeight: typography.weight.bold,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.4,
                                    }}
                                >
                                    {plan.totalDays} days
                                    {firstItem
                                        ? ` | Day 1 pages ${firstItem.startPage}-${firstItem.endPage}`
                                        : ""}
                                </Text>

                                {isActive ? (
                                    <Text
                                        style={{
                                            color: colors.accent.success,
                                            fontSize: typography.size.sm,
                                            fontWeight: typography.weight.bold,
                                        }}
                                    >
                                        Current active plan
                                    </Text>
                                ) : null}

                                <Pressable
                                    onPress={() => {
                                        if (!isActive) {
                                            handleSelectPlan(plan.id);
                                        }
                                    }}
                                    style={{
                                        alignSelf: "flex-start",
                                        borderRadius: 999,
                                        backgroundColor: isActive ? colors.primary.deepGreen : "#EFE2B6",
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: isActive ? "#FFF9EA" : colors.text.primary,
                                            fontSize: typography.size.xs,
                                            fontWeight: typography.weight.extrabold,
                                        }}
                                    >
                                        {isActive ? "Active plan" : "Choose plan"}
                                    </Text>
                                </Pressable>
                            </View>
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
