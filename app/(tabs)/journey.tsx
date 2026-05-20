import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SECTIONS, TOTAL_PAGES } from "../../data/book";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReadingProgress } from "../../hooks/useReadingProgress";
import { useReadingSessions, type ReadingSession } from "../../hooks/useReadingSessions";

export default function JourneyScreen() {
  const router = useRouter();
  const { progress } = useReadingProgress();
  const { bookmarks, removeBookmark } = useBookmarks();
  const {
    getCurrentStreak,
    getTotalSessions,
    getRecentSessions,
    hasReadToday,
  } = useReadingSessions();

  const currentPage = progress?.lastPage ?? 1;
  const completion = Math.round((currentPage / TOTAL_PAGES) * 100);
  const currentStreak = getCurrentStreak();
  const totalSessions = getTotalSessions();
  const recentSessions = getRecentSessions(7);
  const readToday = hasReadToday();

  // Calculate sections completed
  const sectionsCompleted = SECTIONS.filter(
    (section) => currentPage > section.endPage,
  ).length;

  const getSectionForPage = (page: number) => {
    return SECTIONS.find((s) => page >= s.startPage && page <= s.endPage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <View>
          <Text style={{ color: "#173D31", fontSize: 28, fontWeight: "800" }}>
            Journey
          </Text>
          <Text style={{ color: "#55665D", fontSize: 15, lineHeight: 22, marginTop: 4 }}>
            Your reading progress and saved moments
          </Text>
        </View>

        {/* Progress Card */}
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
            Page {currentPage} of {TOTAL_PAGES}
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: "rgba(255, 249, 234, 0.2)",
              borderRadius: 4,
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${completion}%`,
                backgroundColor: "#F1E0A4",
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
          }}
        >
          {/* Streak Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#FBF7EE",
              borderRadius: 20,
              padding: 16,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: readToday
                  ? "rgba(241, 224, 164, 0.3)"
                  : "rgba(124, 110, 63, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="flame"
                size={22}
                color={readToday ? "#F1E0A4" : "#7C6E3F"}
              />
            </View>
            <Text style={{ color: "#173D31", fontSize: 24, fontWeight: "800" }}>
              {currentStreak}
            </Text>
            <Text style={{ color: "#64756C", fontSize: 13, fontWeight: "600" }}>
              Day Streak
            </Text>
          </View>

          {/* Sessions Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#FBF7EE",
              borderRadius: 20,
              padding: 16,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(124, 110, 63, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="book-outline" size={22} color="#7C6E3F" />
            </View>
            <Text style={{ color: "#173D31", fontSize: 24, fontWeight: "800" }}>
              {totalSessions}
            </Text>
            <Text style={{ color: "#64756C", fontSize: 13, fontWeight: "600" }}>
              Sessions
            </Text>
          </View>

          {/* Sections Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#FBF7EE",
              borderRadius: 20,
              padding: 16,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(124, 110, 63, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color="#7C6E3F" />
            </View>
            <Text style={{ color: "#173D31", fontSize: 24, fontWeight: "800" }}>
              {sectionsCompleted}
            </Text>
            <Text style={{ color: "#64756C", fontSize: 13, fontWeight: "600" }}>
              Sections
            </Text>
          </View>
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
              Recent Sessions
            </Text>
            <View style={{ gap: 10 }}>
              {recentSessions.slice(0, 5).map((session: ReadingSession) => {
                const sessionDate = new Date(session.date);
                const isToday =
                  sessionDate.toDateString() === new Date().toDateString();

                return (
                  <View
                    key={session.id}
                    style={{
                      backgroundColor: "#FBF7EE",
                      borderRadius: 18,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
                        <View>
                          <Text
                            style={{
                              color: "#173D31",
                              fontSize: 15,
                              fontWeight: "700",
                            }}
                          >
                            {session.pagesRead} pages
                          </Text>
                          <Text style={{ color: "#7A8A82", fontSize: 13 }}>
                            {isToday ? "Today" : formatDate(session.date)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            color: "#7C6E3F",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {session.durationMinutes} min
                        </Text>
                        <Text style={{ color: "#7A8A82", fontSize: 12 }}>
                          Pages {session.startPage}-{session.endPage}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bookmarks Section */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#173D31", fontSize: 20, fontWeight: "800" }}>
              Bookmarks
            </Text>
            <View
              style={{
                backgroundColor: "#173D31",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#FFF9EA", fontSize: 13, fontWeight: "700" }}>
                {bookmarks.length}
              </Text>
            </View>
          </View>

          {bookmarks.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FBF7EE",
                borderRadius: 22,
                padding: 32,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="bookmark-outline" size={48} color="#C8D5CD" />
              <Text
                style={{
                  color: "#55665D",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                No bookmarks yet
              </Text>
              <Text
                style={{
                  color: "#7A8A82",
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Tap the bookmark icon while reading to save a page
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {bookmarks.map((bookmark) => {
                const section = getSectionForPage(bookmark.page);
                return (
                  <Pressable
                    key={bookmark.id}
                    onPress={() => router.push(`/reader/${bookmark.page}`)}
                    style={{
                      backgroundColor: "#FBF7EE",
                      borderRadius: 18,
                      padding: 16,
                      gap: 8,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "rgba(23, 61, 49, 0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="bookmark" size={22} color="#173D31" />
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#173D31",
                            fontSize: 16,
                            fontWeight: "800",
                          }}
                        >
                          Page {bookmark.page}
                        </Text>
                        {section && (
                          <Text
                            style={{
                              color: "#7C6E3F",
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            • {section.title}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: "#7A8A82", fontSize: 13 }}>
                        {formatDate(bookmark.createdAt)}
                      </Text>
                    </View>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        removeBookmark(bookmark.id);
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(220, 53, 69, 0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC3545" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
