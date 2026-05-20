import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";

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
                        backgroundColor: "#FBF7EE",
                        borderRadius: 28,
                        padding: 28,
                        width: "100%",
                        maxWidth: 400,
                        gap: 20,
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
                            <Ionicons name="checkmark-circle" size={48} color="#5A9B6E" />
                        </View>
                    </View>

                    {/* Title */}
                    <View style={{ alignItems: "center", gap: 8 }}>
                        <Text
                            style={{
                                color: "#173D31",
                                fontSize: 24,
                                fontWeight: "800",
                                textAlign: "center",
                            }}
                        >
                            Session Complete
                        </Text>
                        <Text
                            style={{
                                color: "#64756C",
                                fontSize: 16,
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
                            backgroundColor: "#F7F1E2",
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
                                    <Ionicons name="book" size={18} color="#173D31" />
                                </View>
                                <Text style={{ color: "#55665D", fontSize: 15 }}>Pages read</Text>
                            </View>
                            <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
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
                                    <Ionicons name="time" size={18} color="#173D31" />
                                </View>
                                <Text style={{ color: "#55665D", fontSize: 15 }}>Time spent</Text>
                            </View>
                            <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
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
                                                ? "rgba(241, 224, 164, 0.3)"
                                                : "rgba(23, 61, 49, 0.1)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons
                                            name="flame"
                                            size={18}
                                            color={isNewStreak ? "#F1E0A4" : "#173D31"}
                                        />
                                    </View>
                                    <Text style={{ color: "#55665D", fontSize: 15 }}>
                                        {isNewStreak ? "New streak!" : "Current streak"}
                                    </Text>
                                </View>
                                <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
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
                                        <Ionicons name="checkmark-done" size={18} color="#173D31" />
                                    </View>
                                    <Text style={{ color: "#55665D", fontSize: 15 }}>
                                        Sections completed
                                    </Text>
                                </View>
                                <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
                                    {sectionsCompleted}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={{ gap: 12 }}>
                        <Pressable
                            onPress={handleContinue}
                            style={{
                                backgroundColor: "#173D31",
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ color: "#FFF9EA", fontSize: 16, fontWeight: "800" }}>
                                Continue Reading
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleGoHome}
                            style={{
                                backgroundColor: "transparent",
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ color: "#173D31", fontSize: 16, fontWeight: "700" }}>
                                Go to Home
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
