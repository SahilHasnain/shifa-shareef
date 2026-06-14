import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import { getVolumeDisplayTitle, shouldShowVolumeLabel } from "../../data/languages";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useCurrentVolume } from "../../hooks/useCurrentVolume";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useResolvedVolume } from "../../hooks/useResolvedVolume";
import { useVolumeProgress } from "../../hooks/useVolumeProgress";
import { buildReaderHref } from "../../lib/section-resolver";
import {
  getCurrentPlanDay,
  getPlanDayProgress,
  getPlanItemForDay,
  getPlanItemNavigationTarget,
  getPlanItemPageLabel,
} from "../../lib/plan-resolver";

export default function PlansScreen() {
    const router = useRouter();
    const { colors, resolvedTheme } = useAppTheme();
    const { currentLanguage, currentLanguageId } = useCurrentLanguage();
    const { currentVolume, currentVolumeId } = useCurrentVolume(currentLanguageId);
    const resolvedVolume = useResolvedVolume(currentLanguageId, currentVolumeId);
    const { progress } = useVolumeProgress(currentVolumeId, currentLanguageId);
    const { activePlan, activePlanData, startPlan, clearPlan, isDayCompleted } = useReadingPlan(
        currentVolumeId,
        currentLanguageId,
    );
    const showVolumeLabel = shouldShowVolumeLabel(currentLanguageId);
    const currentVolumeDisplayTitle = getVolumeDisplayTitle(
        currentLanguageId,
        currentVolumeId,
        currentVolume.title,
    );
    const currentPlanDay = activePlan
        ? getCurrentPlanDay(resolvedVolume, activePlan, progress)
        : 1;
    const currentPlanProgress = activePlan
        ? getPlanDayProgress(resolvedVolume, activePlan, progress)
        : 0;
    const todayPlanItem = activePlan
        ? getPlanItemForDay(activePlan, currentPlanDay)
        : undefined;
    const completedPlanDays = activePlanData?.completedDays.length ?? 0;
    const readingPlans = currentVolume.plans;
    const isDark = resolvedTheme === "dark";
    const screenBackground = isDark ? "#0B100D" : colors.surface.lightCream;
    const cardBackground = isDark ? "#151B17" : colors.surface.warmIvory;
    const elevatedCardBackground = isDark ? "#1B211D" : colors.surface.warmIvory;
    const cardBorderColor = isDark ? "rgba(255, 230, 128, 0.08)" : "transparent";
    const descriptionColor = isDark ? "#B8B6AC" : colors.text.muted;
    const buttonBackground = isDark ? colors.secondary.lightGold : colors.surface.softBeige;
    const buttonTextColor = isDark ? "#171A14" : colors.text.primary;

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
        <SafeAreaView style={{ flex: 1, backgroundColor: screenBackground }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => ({
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: cardBackground,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.7 : 1,
                            ...shadows.sm,
                        })}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={24}
                            color={isDark ? colors.secondary.lightGold : colors.primary.deepGreen}
                        />
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

                        {todayPlanItem ? (
                            <View style={{ gap: 12 }}>
                                <Text
                                    style={{
                                        color: "#C6D4CB",
                                        fontSize: typography.size.base,
                                        lineHeight: 22,
                                    }}
                                >
                                    Today: {todayPlanItem.label}
                                </Text>
                                <Text
                                    style={{
                                        color: colors.text.light,
                                        fontSize: typography.size.sm,
                                    }}
                                >
                                    {getPlanItemPageLabel(resolvedVolume, todayPlanItem)}
                                    {" • "}
                                    {todayPlanItem.estimatedMinutes} min
                                    {isDayCompleted(currentPlanDay) ? " • Completed" : ""}
                                </Text>
                                <Pressable
                                    onPress={() =>
                                        router.push(
                                            buildReaderHref(
                                                currentLanguageId,
                                                currentVolumeId,
                                                getPlanItemNavigationTarget(
                                                    resolvedVolume,
                                                    todayPlanItem,
                                                ),
                                            ) as any,
                                        )
                                    }
                                    style={({ pressed }) => ({
                                        alignSelf: "flex-start",
                                        borderRadius: 999,
                                        backgroundColor: colors.secondary.lightGold,
                                        paddingHorizontal: 18,
                                        paddingVertical: 12,
                                        opacity: pressed ? 0.85 : 1,
                                    })}
                                >
                                    <Text
                                        style={{
                                            color: colors.primary.deepGreen,
                                            fontSize: typography.size.sm,
                                            fontWeight: typography.weight.extrabold,
                                        }}
                                    >
                                        {isDayCompleted(currentPlanDay)
                                            ? "Review today's reading"
                                            : "Start today's reading"}
                                    </Text>
                                </Pressable>
                                {completedPlanDays > 0 ? (
                                    <Text
                                        style={{
                                            color: "#C6D4CB",
                                            fontSize: typography.size.sm,
                                        }}
                                    >
                                        {completedPlanDays} day
                                        {completedPlanDays === 1 ? "" : "s"} completed
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                )}

                {/* Available Plans */}
                <View style={{ gap: 14 }}>
                    {readingPlans
                        .filter(plan => plan.id !== activePlan?.id)
                        .map((plan) => {
                        const firstItem = plan.items[0];

                        return (
                            <View
                                key={plan.id}
                                style={{
                                    backgroundColor: cardBackground,
                                    borderRadius: 24,
                                    borderWidth: isDark ? 1 : 0,
                                    borderColor: cardBorderColor,
                                    padding: 18,
                                    gap: 12,
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
                                        color: descriptionColor,
                                        fontSize: typography.size.base,
                                        lineHeight: 24,
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
                                        ? ` | Day 1 ${getPlanItemPageLabel(resolvedVolume, firstItem)}`
                                        : ""}
                                </Text>

                                <Pressable
                                    onPress={() => handleSelectPlan(plan.id)}
                                    style={{
                                        alignSelf: "flex-start",
                                        borderRadius: 999,
                                        backgroundColor: buttonBackground,
                                        paddingHorizontal: 16,
                                        paddingVertical: 11,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: buttonTextColor,
                                            fontSize: typography.size.xs,
                                            fontWeight: typography.weight.extrabold,
                                        }}
                                    >
                                        Choose plan
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>

                {/* Info Card */}
                <View
                    style={{
                        backgroundColor: elevatedCardBackground,
                        borderRadius: 22,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: cardBorderColor,
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
                            color: descriptionColor,
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
