import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";

import { colors, shadows, typography } from "../constants/theme";

type SessionCompletionModalProps = {
    visible: boolean;
    onClose: () => void;
    onContinue?: () => void;
    onGoHome?: () => void;
    pagesRead: number;
    durationMinutes: number;
    currentStreak: number;
    isNewStreak: boolean;
    sectionsCompleted?: number;
};

const ENCOURAGEMENTS = [
    "Every page brings you closer to completion.",
    "Consistency is the key to meaningful progress.",
    "Your dedication is building something beautiful.",
    "Small steps, steady progress.",
    "You're making this a habit.",
    "Another session, another step forward.",
    "Your commitment is inspiring.",
    "Progress over perfection.",
];

export function SessionCompletionModal({
    visible,
    onClose,
    onContinue,
    onGoHome,
    pagesRead,
    durationMinutes,
    currentStreak,
    isNewStreak,
    sectionsCompleted,
}: SessionCompletionModalProps) {
    const router = useRouter();

    const encouragement =
        ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

    const handleContinue = () => {
        onClose();
        if (onContinue) {
            onContinue();
        }
    };

    const handleGoHome = () => {
        onClose();
        if (onGoHome) {
            onGoHome();
        } else {
            router.push("/(tabs)/" as any);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 20,
                }}
            >
                <View
                    style={{
                        backgroundColor: colors.surface.warmIvory,
                        borderRadius: 28,
                        padding: 28,
                        width: "100%",
                        maxWidth: 400,
                        gap: 20,
                        ...shadows.lg,
                    }}
                >
                    {/* Icon */}
                    <View style={{ alignItems: "center" }}>
                        <View
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: "rgba(23, 61, 49, 0.1)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons name="checkmark-circle" size={48} color={colors.accent.success} />
                        </View>
                    </View>

                    {/* Title */}
                    <View style={{ alignItems: "center", gap: 8 }}>
                        <Text
                            style={{
                                color: colors.text.primary,
                                fontSize: typography.size["3xl"],
                                fontWeight: typography.weight.extrabold,
                                textAlign: "center",
                            }}
                        >
                            Session Complete
                        </Text>
                        <Text
                            style={{
                                color: colors.text.muted,
                                fontSize: typography.size.lg,
                                textAlign: "center",
                                lineHeight: 24,
                            }}
                        >
                            {encouragement}
                        </Text>
                    </View>

                    {/* Stats */}
                    <View
                        style={{
                            backgroundColor: colors.surface.creamyWhite,
                            borderRadius: 20,
                            padding: 18,
                            gap: 14,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: "rgba(23, 61, 49, 0.1)",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Ionicons name="book" size={18} color={colors.primary.deepGreen} />
                                </View>
                                <Text
                                    style={{
                                        color: colors.text.tertiary,
                                        fontSize: typography.size.md,
                                    }}
                                >
                                    Pages read
                                </Text>
                            </View>
                            <Text
                                style={{
                                    color: colors.text.primary,
                                    fontSize: typography.size["2xl"],
                                    fontWeight: typography.weight.extrabold,
                                }}
                            >
                                {pagesRead}
                            </Text>
                        </View>

                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: "rgba(23, 61, 49, 0.1)",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Ionicons name="time" size={18} color={colors.primary.deepGreen} />
                                </View>
                                <Text
                                    style={{
                                        color: colors.text.tertiary,
                                        fontSize: typography.size.md,
                                    }}
                                >
                                    Time spent
                                </Text>
                            </View>
                            <Text
                                style={{
                                    color: colors.text.primary,
                                    fontSize: typography.size["2xl"],
                                    fontWeight: typography.weight.extrabold,
                                }}
                            >
                                {durationMinutes} min
                            </Text>
                        </View>

                        {currentStreak > 0 && (
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <View
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: isNewStreak
                                                ? "rgba(241, 224, 164, 0.35)"
                                                : "rgba(23, 61, 49, 0.1)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons
                                            name="flame"
                                            size={18}
                                            color={isNewStreak ? colors.secondary.lightGold : colors.primary.deepGreen}
                                        />
                                    </View>
                                    <Text
                                        style={{
                                            color: colors.text.tertiary,
                                            fontSize: typography.size.md,
                                        }}
                                    >
                                        {isNewStreak ? "New streak!" : "Current streak"}
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        color: colors.text.primary,
                                        fontSize: typography.size["2xl"],
                                        fontWeight: typography.weight.extrabold,
                                    }}
                                >
                                    {currentStreak} {currentStreak === 1 ? "day" : "days"}
                                </Text>
                            </View>
                        )}

                        {sectionsCompleted !== undefined && sectionsCompleted > 0 && (
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <View
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: "rgba(23, 61, 49, 0.1)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons name="checkmark-done" size={18} color={colors.primary.deepGreen} />
                                    </View>
                                    <Text
                                        style={{
                                            color: colors.text.tertiary,
                                            fontSize: typography.size.md,
                                        }}
                                    >
                                        Sections completed
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        color: colors.text.primary,
                                        fontSize: typography.size["2xl"],
                                        fontWeight: typography.weight.extrabold,
                                    }}
                                >
                                    {sectionsCompleted}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Actions */}
                    <View
                        style={{
                            flexDirection: "row",
                            gap: 12,
                            alignItems: "stretch",
                            width: "100%",
                        }}
                    >
                        <Pressable
                            onPress={handleGoHome}
                            style={({ pressed }) => ({
                                backgroundColor: colors.surface.creamyWhite,
                                borderRadius: 18,
                                paddingVertical: 14,
                                paddingHorizontal: 14,
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: pressed ? 0.75 : 1,
                            })}
                        >
                            <Text
                                style={{
                                    color: colors.text.primary,
                                    fontSize: typography.size.md,
                                    fontWeight: typography.weight.bold,
                                }}
                                numberOfLines={1}
                            >
                                Go to Home
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleContinue}
                            style={({ pressed }) => ({
                                backgroundColor: colors.secondary.lightGold,
                                borderRadius: 18,
                                paddingVertical: 14,
                                paddingHorizontal: 14,
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: pressed ? 0.85 : 1,
                                ...shadows.md,
                            })}
                        >
                            <Text
                                style={{
                                    color: colors.primary.deepGreen,
                                    fontSize: typography.size.md,
                                    fontWeight: typography.weight.extrabold,
                                }}
                                numberOfLines={1}
                            >
                                Continue Reading
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
