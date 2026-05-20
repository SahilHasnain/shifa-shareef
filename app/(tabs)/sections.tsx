import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SECTIONS } from "../../data/book";
import { useReadingProgress } from "../../hooks/useReadingProgress";

type FilterType = "all" | "unread" | "in-progress" | "short";

export default function SectionsScreen() {
  const router = useRouter();
  const { progress } = useReadingProgress();
  const [filter, setFilter] = useState<FilterType>("all");

  const getSectionStatus = (section: (typeof SECTIONS)[number]) => {
    if (!progress) return "unread";

    const { lastPage } = progress;

    if (lastPage > section.endPage) return "completed";
    if (lastPage >= section.startPage && lastPage <= section.endPage) return "in-progress";
    return "unread";
  };

  const filteredSections = SECTIONS.filter((section) => {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <Text style={{ color: "#173D31", fontSize: 28, fontWeight: "800" }}>
            Sections
          </Text>
          <Text style={{ color: "#55665D", fontSize: 15, lineHeight: 22, marginTop: 4 }}>
            Navigate the book through meaningful sections
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 16 }}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                backgroundColor: filter === f.key ? "#173D31" : "#FBF7EE",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: filter === f.key ? "#FFF9EA" : "#55665D",
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {filteredSections.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FBF7EE",
                borderRadius: 22,
                padding: 32,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="book-outline" size={48} color="#C8D5CD" />
              <Text style={{ color: "#55665D", fontSize: 16, fontWeight: "600" }}>
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
                  onPress={() => router.push(`/reader/${section.startPage}`)}
                  style={{
                    backgroundColor: isCurrent ? "#173D31" : "#FBF7EE",
                    borderRadius: 22,
                    padding: 18,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: isCurrent ? "#FFF9EA" : "#173D31",
                        fontSize: 18,
                        fontWeight: "800",
                        flex: 1,
                      }}
                    >
                      {section.title}
                    </Text>
                    <View
                      style={{
                        backgroundColor: isCurrent
                          ? "rgba(241, 224, 164, 0.2)"
                          : "rgba(124, 110, 63, 0.1)",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: isCurrent ? "#F1E0A4" : "#7C6E3F",
                          fontSize: 13,
                          fontWeight: "700",
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
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: isCurrent ? "#D8E2DA" : "#55665D",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Pages {section.startPage}-{section.endPage}
                    </Text>
                    {status === "completed" && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={isCurrent ? "#A8D5BA" : "#5A9B6E"}
                        />
                        <Text
                          style={{
                            color: isCurrent ? "#A8D5BA" : "#5A9B6E",
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          Completed
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={{
                      color: isCurrent ? "#C2D2C8" : "#64756C",
                      fontSize: 14,
                      lineHeight: 21,
                    }}
                  >
                    {section.description}
                  </Text>

                  {isCurrent && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <Ionicons name="book" size={16} color="#F1E0A4" />
                      <Text
                        style={{
                          color: "#F1E0A4",
                          fontSize: 13,
                          fontWeight: "700",
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
