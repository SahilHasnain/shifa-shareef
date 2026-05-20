import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getCurrentDayForPlan, getPlanProgress, READING_PLANS } from "../../data/plans";
import { useReadingPlan } from "../../hooks/useReadingPlan";
import { useReadingProgress } from "../../hooks/useReadingProgress";

export default function PlansScreen() {
    const router = useRouter();
    const { progress } = useReadingProgress();
    const { activePlan, startPlan, clearPlan } = useReadingPlan();
    const currentPage = progress?.lastPage ?? 1;

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
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "#FBF7EE",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#173D31" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: "#173D31", fontSize: 28, fontWeight: "800" }}>
                            Reading Plans
                        </Text>
                    </View>
                </View>

                <Text style={{ color: "#55665D", fontSize: 15, lineHeight: 22 }}>
                    Choose a plan that matches your pace. Consistency matters more than speed.
                </Text>

                {/* Active Plan Card */}
                {activePlan && (
                    <View
                        style={{
                            backgroundColor: "#173D31",
                            borderRadius: 22,
                            padding: 18,
                            gap: 12,
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
                                <Text style={{ color: "#D8E2DA", fontSize: 13, fontWeight: "700" }}>
                                    Active Plan
                                </Text>
                                <Text style={{ color: "#FFF9EA", fontSize: 20, fontWeight: "800", marginTop: 4 }}>
                                    {activePlan.title}
                                </Text>
                            </View>
                            <Pressable
                                onPress={handleClearPlan}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    backgroundColor: "rgba(220, 53, 69, 0.2)",
                                }}
                            >
                                <Text style={{ color: "#FFB3BA", fontSize: 13, fontWeight: "700" }}>
                                    Clear
                                </Text>
                            </Pressable>
                        </View>

                        <View style={{ gap: 6 }}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ color: "#C8D5CD", fontSize: 14 }}>
                                    Day {getCurrentDayForPlan(activePlan, currentPage)} of {activePlan.totalDays}
                                </Text>
                                <Text style={{ color: "#F1E0A4", fontSize: 14, fontWeight: "700" }}>
                                    {getPlanProgress(activePlan, currentPage)}%
                                </Text>
                            </View>
                            <View
                                style={{
                                    height: 6,
                                    backgroundColor: "rgba(255, 249, 234, 0.2)",
                                    borderRadius: 3,
                                    overflow: "hidden",
                                }}
                            >
                                <View
                                    style={{
                                        height: "100%",
                                        width: `${getPlanProgress(activePlan, currentPage)}%`,
                                        backgroundColor: "#F1E0A4",
                                        borderRadius: 3,
                                    }}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* Available Plans */}
                <View style={{ gap: 12 }}>
                    {READING_PLANS.map((plan) => {
                        const isActive = activePlan?.id === plan.id;

                        return (
                            <Pressable
                                key={plan.id}
                                onPress={() => !isActive && handleSelectPlan(plan.id)}
                                disabled={isActive}
                                style={{
                                    backgroundColor: isActive ? "#E8F5E9" : "#FBF7EE",
                                    borderRadius: 22,
                                    padding: 18,
                                    gap: 12,
                                    opacity: isActive ? 0.7 : 1,
                                }}
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
                                        <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
                                            {plan.title}
                                        </Text>
                                        {isActive && (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    marginTop: 4,
                                                }}
                                            >
                                                <Ionicons name="checkmark-circle" size={16} color="#5A9B6E" />
                                                <Text style={{ color: "#5A9B6E", fontSize: 13, fontWeight: "700" }}>
                                                    Currently Active
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View
                                        style={{
                                            backgroundColor: "rgba(124, 110, 63, 0.1)",
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text style={{ color: "#7C6E3F", fontSize: 13, fontWeight: "700" }}>
                                            {plan.totalDays} days
                                        </Text>
                                    </View>
                                </View>

                                <Text style={{ color: "#64756C", fontSize: 14, lineHeight: 21 }}>
                                    {plan.description}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 16,
                                        paddingTop: 8,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Ionicons name="book-outline" size={18} color="#7A8A82" />
                                        <Text style={{ color: "#55665D", fontSize: 13, fontWeight: "600" }}>
                                            {plan.pagesPerDay} pages/day
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Ionicons name="time-outline" size={18} color="#7A8A82" />
                                        <Text style={{ color: "#55665D", fontSize: 13, fontWeight: "600" }}>
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
                        backgroundColor: "#FBF7EE",
                        borderRadius: 22,
                        padding: 18,
                        gap: 8,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="information-circle-outline" size={20} color="#7C6E3F" />
                        <Text style={{ color: "#173D31", fontSize: 16, fontWeight: "700" }}>
                            About Plans
                        </Text>
                    </View>
                    <Text style={{ color: "#64756C", fontSize: 14, lineHeight: 21 }}>
                        Plans help you build consistency. Choose one that feels sustainable. You can always
                        switch or read at your own pace without a plan.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
