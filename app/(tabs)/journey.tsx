import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows, typography } from "../../constants/theme";
import {
  getCurrentSectionByLanguage,
  getVolumeByLanguageAndId,
  getVolumeDisplayTitle,
  shouldShowVolumeLabel,
} from "../../data/languages";
import type { Bookmark } from "../../data/types";
import { useCurrentLanguage } from "../../hooks/useCurrentLanguage";
import { useGlobalStats } from "../../hooks/useGlobalStats";
import { useReadingSessions, type ReadingSession } from "../../hooks/useReadingSessions";

export default function JourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentLanguage, currentLanguageId } = useCurrentLanguage();
  const showVolumeLabel = shouldShowVolumeLabel(currentLanguageId);
  const [filterVolumeId, setFilterVolumeId] = useState<string | null>(null);
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const { volumeStats, languageStats } = useGlobalStats();
  const {
    sessions,
    getCurrentStreak,
    getRecentSessions,
    hasReadToday,
    getSessionsForLanguage,
  } = useReadingSessions();

  useEffect(() => {
    let isMounted = true;

    async function loadAllBookmarks() {
      const bookmarkSets = await Promise.all(
        currentLanguage.volumes.map(async (volume) => {
          const stored = await AsyncStorage.getItem(
            `shifa-shareef:bookmarks-${currentLanguageId}-${volume.id}`,
          );
          return stored ? (JSON.parse(stored) as Bookmark[]) : [];
        }),
      );

      if (isMounted) {
        setAllBookmarks(
          bookmarkSets.flat().sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }),
        );
      }
    }

    void loadAllBookmarks();

    return () => {
      isMounted = false;
    };
  }, [currentLanguage.volumes, currentLanguageId]);

  const currentStreak = getCurrentStreak();
  const totalSessions = getSessionsForLanguage(currentLanguageId).length;
  const readToday = hasReadToday();

  const filteredSessions = useMemo(() => {
    const recentSessions = getRecentSessions(7).filter(
      (session) => session.languageId === currentLanguageId,
    );
    if (!filterVolumeId) {
      return recentSessions;
    }

    return recentSessions.filter((session) => session.volumeId === filterVolumeId);
  }, [currentLanguageId, filterVolumeId, getRecentSessions]);

  const filteredBookmarks = useMemo(() => {
    if (!filterVolumeId) {
      return allBookmarks;
    }

    return allBookmarks.filter((bookmark) => bookmark.volumeId === filterVolumeId);
  }, [allBookmarks, filterVolumeId]);

  const filteredPagesRead = filterVolumeId
    ? volumeStats[filterVolumeId] ?? 0
    : languageStats[currentLanguageId] ?? 0;
  const filteredSessionCount = filterVolumeId
    ? sessions.filter(
        (session) =>
          session.languageId === currentLanguageId &&
          session.volumeId === filterVolumeId,
      ).length
    : totalSessions;

  const filteredSectionsCompleted = filterVolumeId
    ? (() => {
      const volume = getVolumeByLanguageAndId(currentLanguageId, filterVolumeId);
      const latestSession = sessions.find(
        (session) =>
          session.languageId === currentLanguageId &&
          session.volumeId === filterVolumeId,
      );
      const latestPage = latestSession?.endPage ?? 1;
      return volume.sections.filter((section) => latestPage > section.endPage).length;
    })()
    : sessions
        .filter((session) => session.languageId === currentLanguageId)
        .reduce((maxCompleted, session) => {
      const volume = getVolumeByLanguageAndId(currentLanguageId, session.volumeId);
      const completed = volume.sections.filter(
        (section) => session.endPage > section.endPage,
      ).length;
      return Math.max(maxCompleted, completed);
    }, 0);

  const progressPercent = Math.min(
    100,
    filterVolumeId
      ? Math.round(
        ((volumeStats[filterVolumeId] ?? 0) /
          getVolumeByLanguageAndId(currentLanguageId, filterVolumeId).totalPages) *
        100,
      )
      : Math.round(
        ((languageStats[currentLanguageId] ?? 0) /
          currentLanguage.volumes.reduce((sum, volume) => sum + volume.totalPages, 0)) *
        100,
      ),
  );

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

  const removeBookmark = async (bookmark: Bookmark) => {
    const nextBookmarks = allBookmarks.filter((item) => item.id !== bookmark.id);
    setAllBookmarks(nextBookmarks);

    const volumeBookmarks = nextBookmarks.filter(
      (item) =>
        item.languageId === bookmark.languageId && item.volumeId === bookmark.volumeId,
    );
    await AsyncStorage.setItem(
      `shifa-shareef:bookmarks-${bookmark.languageId}-${bookmark.volumeId}`,
      JSON.stringify(volumeBookmarks),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.lightCream }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 5, padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
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
            {currentLanguage.title} reading history, with optional volume filters.
          </Text>
        </View>

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
            {filterVolumeId
              ? `${getVolumeDisplayTitle(
                  currentLanguageId,
                  filterVolumeId,
                  getVolumeByLanguageAndId(currentLanguageId, filterVolumeId).title,
                )} Progress`
              : `${currentLanguage.title} Progress`}
          </Text>
          <Text
            style={{
              color: "#FFF9EA",
              fontSize: typography.size["5xl"],
              fontWeight: typography.weight.extrabold,
            }}
          >
            {filteredPagesRead}
          </Text>
          <Text
            style={{
              color: "#C6D4CB",
              fontSize: typography.size.md,
            }}
          >
            {filterVolumeId
              ? showVolumeLabel
                ? "Pages read in this volume"
                : "Pages read in this edition"
              : showVolumeLabel
                ? "Pages read across all volumes"
                : "Pages read in this language"}
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
                width: `${progressPercent}%`,
                backgroundColor: colors.secondary.lightGold,
                borderRadius: 5,
              }}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          <Pressable
            onPress={() => setFilterVolumeId(null)}
            style={({ pressed }) => ({
              backgroundColor:
                filterVolumeId === null
                  ? colors.secondary.warmGold
                  : colors.surface.warmIvory,
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: 20,
              opacity: pressed ? 0.9 : 1,
              ...shadows.sm,
            })}
          >
            <Text
              style={{
                color:
                  filterVolumeId === null
                    ? colors.primary.deepGreen
                    : colors.text.tertiary,
                fontWeight: typography.weight.bold,
              }}
            >
              {showVolumeLabel ? `All ${currentLanguage.title}` : currentLanguage.title}
            </Text>
          </Pressable>
          {currentLanguage.volumes.map((volume) => {
            const isActive = filterVolumeId === volume.id;
            return (
              <Pressable
                key={volume.id}
                onPress={() => setFilterVolumeId(volume.id)}
                style={({ pressed }) => ({
                  backgroundColor: isActive
                    ? colors.secondary.warmGold
                    : colors.surface.warmIvory,
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 20,
                  opacity: pressed ? 0.9 : 1,
                  ...shadows.sm,
                })}
              >
                <Text
                  style={{
                    color: isActive
                      ? colors.primary.deepGreen
                      : colors.text.tertiary,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  {getVolumeDisplayTitle(currentLanguageId, volume.id, volume.title)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            gap: 14,
          }}
        >
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
              {filteredSessionCount}
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
              {filteredSectionsCompleted}
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

        {filteredSessions.length > 0 && (
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
              {filteredSessions.slice(0, 5).map((session: ReadingSession) => {
                const sessionDate = new Date(session.date);
                const isToday =
                  sessionDate.toDateString() === new Date().toDateString();
                const sessionVolume = getVolumeByLanguageAndId(
                  session.languageId,
                  session.volumeId,
                );

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
                              color: colors.secondary.mutedGold,
                              fontSize: typography.size.xs,
                              fontWeight: typography.weight.bold,
                            }}
                          >
                            {session.languageId === currentLanguageId
                              ? getVolumeDisplayTitle(
                                  session.languageId,
                                  session.volumeId,
                                  sessionVolume.title,
                                )
                              : shouldShowVolumeLabel(session.languageId)
                                ? `${session.languageId} • ${getVolumeDisplayTitle(
                                    session.languageId,
                                    session.volumeId,
                                    sessionVolume.title,
                                  )}`
                                : session.languageId}
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
                {filteredBookmarks.length}
              </Text>
            </View>
          </View>

          {filteredBookmarks.length === 0 ? (
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
              {filteredBookmarks.map((bookmark) => {
                const section = getCurrentSectionByLanguage(
                  bookmark.languageId,
                  bookmark.volumeId,
                  bookmark.page,
                );
                const bookmarkVolume = getVolumeByLanguageAndId(
                  bookmark.languageId,
                  bookmark.volumeId,
                );

                return (
                  <Pressable
                    key={bookmark.id}
                    onPress={() =>
                      router.push(
                        `/reader/${bookmark.languageId}/${bookmark.volumeId}/${bookmark.page}` as any,
                      )
                    }
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
                          {bookmark.languageId === currentLanguageId
                            ? showVolumeLabel
                              ? `${getVolumeDisplayTitle(
                                  bookmark.languageId,
                                  bookmark.volumeId,
                                  bookmarkVolume.title,
                                )}: Page ${bookmark.page}`
                              : `Page ${bookmark.page}`
                            : shouldShowVolumeLabel(bookmark.languageId)
                              ? `${bookmark.languageId} • ${getVolumeDisplayTitle(
                                  bookmark.languageId,
                                  bookmark.volumeId,
                                  bookmarkVolume.title,
                                )}: Page ${bookmark.page}`
                              : `${bookmark.languageId} • Page ${bookmark.page}`}
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
                      onPress={(event) => {
                        event.stopPropagation();
                        void removeBookmark(bookmark);
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
    </View>
  );
}
