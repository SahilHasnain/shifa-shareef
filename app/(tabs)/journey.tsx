import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TOTAL_PAGES } from "../../data/book";
import { useReadingProgress } from "../../hooks/useReadingProgress";

export default function JourneyScreen() {
  const { progress } = useReadingProgress();
  const currentPage = progress?.lastPage ?? 1;
  const completion = Math.round((currentPage / TOTAL_PAGES) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: "#173D31", fontSize: 28, fontWeight: "800" }}>
          Journey
        </Text>
        <Text style={{ color: "#55665D", fontSize: 15, lineHeight: 22 }}>
          A simple record of continuation. This screen stays reflective, not noisy.
        </Text>

        <View
          style={{
            backgroundColor: "#173D31",
            borderRadius: 26,
            padding: 20,
            gap: 14,
          }}
        >
          <Text style={{ color: "#D8E2DA", fontSize: 14, fontWeight: "700" }}>
            Current Progress
          </Text>
          <Text style={{ color: "#FFF9EA", fontSize: 34, fontWeight: "800" }}>
            {completion}%
          </Text>
          <Text style={{ color: "#C6D4CB", fontSize: 15 }}>
            Last saved page: {currentPage} of {TOTAL_PAGES}
          </Text>
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
            Phase 1 Notes
          </Text>
          <Text style={{ color: "#55665D", lineHeight: 22 }}>
            Bookmarks, plans, and session history come in the next phase. For now,
            this app remembers where reading stopped and lets the user continue in
            one tap.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
