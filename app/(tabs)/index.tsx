import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BOOK_TITLE, SECTIONS, TOTAL_PAGES } from "../../data/book";
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

  const currentPage = progress?.lastPage ?? 1;
  const currentSection =
    SECTIONS.find(
      (section) =>
        currentPage >= section.startPage && currentPage <= section.endPage,
    ) ?? SECTIONS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View
          style={{
            backgroundColor: "#173D31",
            borderRadius: 28,
            padding: 22,
            gap: 12,
          }}
        >
          <Text style={{ color: "#D8E2DA", fontSize: 13, fontWeight: "700" }}>
            Continue Reading
          </Text>
          <Text style={{ color: "#FFF9EA", fontSize: 28, fontWeight: "800" }}>
            {BOOK_TITLE}
          </Text>
          <Text style={{ color: "#E6D79C", fontSize: 16, fontWeight: "600" }}>
            {currentSection.title}
          </Text>
          <Text style={{ color: "#C8D5CD", fontSize: 15, lineHeight: 22 }}>
            Page {currentPage} of {TOTAL_PAGES}
          </Text>
          <Text style={{ color: "#AFC4B8", fontSize: 13 }}>
            {isLoaded ? formatLastRead(progress?.lastReadAt) : "Loading progress..."}
          </Text>
          <Pressable
            onPress={() => router.push(`/reader/${currentPage}`)}
            style={{
              alignSelf: "flex-start",
              marginTop: 8,
              borderRadius: 999,
              backgroundColor: "#F0E1A7",
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#173D31", fontSize: 15, fontWeight: "800" }}>
              Resume Reading
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: "#FBF7EE",
            borderRadius: 24,
            padding: 18,
            gap: 10,
          }}
        >
          <Text style={{ color: "#173D31", fontSize: 18, fontWeight: "800" }}>
            Today&apos;s gentle target
          </Text>
          <Text style={{ color: "#4D5E54", fontSize: 15, lineHeight: 22 }}>
            Read 2 pages from your current place. The goal is consistency, not
            speed.
          </Text>
          <Pressable
            onPress={() => router.push(`/reader/${currentPage}`)}
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#D6C88E",
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: "#173D31", fontWeight: "700" }}>
              Read for 5 minutes
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: "#F7F1E2",
            borderRadius: 24,
            padding: 18,
            gap: 12,
          }}
        >
          <Text style={{ color: "#173D31", fontSize: 18, fontWeight: "800" }}>
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
                <Text style={{ color: "#20352D", fontSize: 15, fontWeight: "700" }}>
                  {section.title}
                </Text>
                <Text style={{ color: "#5E6C65", fontSize: 13 }}>
                  Pages {section.startPage}-{section.endPage}
                </Text>
              </View>
              <Text style={{ color: "#8A7A45", fontSize: 13, fontWeight: "700" }}>
                {section.estimatedMinutes} min
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: "#FBF7EE",
            borderRadius: 24,
            padding: 18,
          }}
        >
          <Text
            style={{
              color: "#274236",
              fontSize: 16,
              lineHeight: 26,
              fontWeight: "600",
            }}
          >
            Begin with calm. Continue with steadiness. Let the app remove friction
            so the reading itself can remain the focus.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
