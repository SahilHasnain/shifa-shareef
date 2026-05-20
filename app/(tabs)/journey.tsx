import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            Journey
          </Text>
          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.md,
              lineHeight: 22,
              marginTop: 6,
            }}
          >
            Your reading progress and saved moments
          </Text>
        </View>

        {/* Progress Card */}
        <View
          style={{
            backgroundColor: colors.primary.deepGreen,
            borderRadius: 28,
            padding: 24,
            gap: 16,
            ...shadows.lg,
          }}
        >
          <Text
            style={{
              color: colors.text.light,
              fontSize: typography.size.base,
              fontWeight: typography.weight.bold,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Current Progress
          </Text>
          <Text
            style={{
              color: "#FFF9EA",
              fontSize: typography.size["5xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            {completion}%
          </Text>
          <Text
            style={{
              color: "#C6D4CB",
              fontSize: typography.size.md,
            }}
          >
            Page {currentPage} of {TOTAL_PAGES}
          </Text>
          <View
            style={{
              height: 10,
              backgroundColor: "rgba(255, 249, 234, 0.2)",
              borderRadius: 5,
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${completion}%`,
                backgroundColor: colors.secondary.lightGold,
                borderRadius: 5,
              }}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View
          style={{
            flexDirection: "row",
            gap: 14,
          }}
        >
          {/* Streak Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface.warmIvory,
              borderRadius: 22,
              padding: 18,
              gap: 10,
              ...shadows.md,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: readToday
                  ? "rgba(241, 224, 164, 0.35)"
                  : "rgba(201, 169, 97, 0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="flame"
                size={24}
                color={readToday ? colors.secondary.lightGold : colors.secondary.mutedGold}
              />
            </View>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size["3xl"],
                fontWeight: typography.weight.extrabold,
              }}
            >
              {currentStreak}
            </Text>
            <Text
              style={{
                color: colors.text.muted,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold,
              }}
            >
              Day Streak
            </Text>
          </View>

          {/* Sessions Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface.warmIvory,
              borderRadius: 22,
              padding: 18,
              gap: 10,
              ...shadows.md,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(201, 169, 97, 0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="book-outline" size={24} color={colors.secondary.mutedGold} />
            </View>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size["3xl"],
                fontWeight: typography.weight.extrabold,
              }}
            >
              {totalSessions}
            </Text>
            <Text
              style={{
                color: colors.text.muted,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold,
              }}
            >
              Sessions
            </Text>
          </View>

          {/* Sections Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface.warmIvory,
              borderRadius: 22,
              padding: 18,
              gap: 10,
              ...shadows.md,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(201, 169, 97, 0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color={colors.secondary.mutedGold} />
            </View>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size["3xl"],
                fontWeight: typography.weight.extrabold,
              }}
            >
              {sectionsCompleted}
            </Text>
            <Text
              style={{
                color: colors.text.muted,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold,
              }}
            >
              Sections
            </Text>
          </View>
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={{ gap: 14 }}>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: typography.size["2xl"],
                fontWeight: typography.weight.extrabold,
              }}
            >
              Recent Sessions
            </Text>
            <View style={{ gap: 12 }}>
              {recentSessions.slice(0, 5).map((session: ReadingSession) => {
                const sessionDate = new Date(session.date);
                const isToday =
                  sessionDate.toDateString() === new Date().toDateString();

                return (
                  <View
                    key={session.id}
                    style={{
                      backgroundColor: colors.surface.warmIvory,
                      borderRadius: 20,
                      padding: 18,
                      gap: 10,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "rgba(23, 61, 49, 0.1)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="book" size={20} color={colors.primary.deepGreen} />
                        </View>
                        <View>
                          <Text
                            style={{
                              color: colors.text.primary,
                              fontSize: typography.size.md,
                              fontWeight: typography.weight.bold,
                            }}
                          >
                            {session.pagesRead} pages
                          </Text>
                          <Text
                            style={{
                              color: colors.text.subtle,
                              fontSize: typography.size.sm,
                            }}
                          >
                            {isToday ? "Today" : formatDate(session.date)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            color: colors.secondary.mutedGold,
                            fontSize: typography.size.sm,
                            fontWeight: typography.weight.semibold,
                          }}
                        >
                          {session.durationMinutes} min
                        </Text>
                        <Text
                          style={{
                            color: colors.text.subtle,
                            fontSize: typography.size.xs,
                            marginTop: 2,
                          }}
                        >
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
      </ScrollView >
    </SafeAreaView >
  );
}
