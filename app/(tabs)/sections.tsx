import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SECTIONS } from "../../data/book";
import { useReadingProgress } from "../../hooks/useReadingProgress";

export default function SectionsScreen() {
  const router = useRouter();
  const { progress } = useReadingProgress();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: "#173D31", fontSize: 28, fontWeight: "800" }}>
          Sections
        </Text>
        <Text style={{ color: "#55665D", fontSize: 15, lineHeight: 22 }}>
          Structured entry points make the book feel lighter and easier to continue.
        </Text>

        {SECTIONS.map((section) => {
          const isCurrent =
            progress &&
            progress.lastPage >= section.startPage &&
            progress.lastPage <= section.endPage;

          return (
            <Pressable
              key={section.id}
              onPress={() => router.push(`/reader/${section.startPage}`)}
              style={{
                backgroundColor: isCurrent ? "#173D31" : "#FBF7EE",
                borderRadius: 22,
                padding: 18,
                gap: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                <Text
                  style={{
                    color: isCurrent ? "#F1E0A4" : "#7C6E3F",
                    fontWeight: "700",
                  }}
                >
                  {section.estimatedMinutes} min
                </Text>
              </View>
              <Text style={{ color: isCurrent ? "#D8E2DA" : "#55665D" }}>
                Pages {section.startPage}-{section.endPage}
              </Text>
              <Text
                style={{
                  color: isCurrent ? "#C2D2C8" : "#64756C",
                  lineHeight: 21,
                }}
              >
                {section.description}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
