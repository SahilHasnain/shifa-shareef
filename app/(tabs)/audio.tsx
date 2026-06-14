import { Ionicons } from "@expo/vector-icons";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useShifaAudios } from "../../hooks/useShifaAudios";
import {
  getShifaAudioFileUrl,
  type ShifaAudioTrack,
} from "../../lib/shifa-audio-service";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  return `${minutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}

function formatPlaybackMillis(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatUploadDate(uploadedAt: string | null): string {
  if (!uploadedAt) {
    return "Unknown date";
  }

  const parsed = new Date(uploadedAt);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString();
}

export default function AudioScreen() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useAppTheme();
  const { tracks, isLoading, isRefreshing, error, refresh } = useShifaAudios();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const isDark = resolvedTheme === "dark";
  const screenBackground = isDark ? "#0B100D" : colors.surface.lightCream;
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const activeCardBackground = isDark ? "#23302A" : "#F8F0D8";
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.09)" : "transparent";
  const progressTrackColor = isDark
    ? "rgba(241, 224, 164, 0.18)"
    : "rgba(201, 169, 97, 0.2)";

  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === activeTrackId) ?? null,
    [activeTrackId, tracks],
  );
  const progressFraction =
    durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  const unloadSound = useCallback(async () => {
    if (!soundRef.current) {
      return;
    }

    await soundRef.current.unloadAsync();
    soundRef.current = null;
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setPlaybackError("Playback failed for this track.");
        setIsPlaying(false);
      }
      return;
    }

    setPositionMillis(status.positionMillis ?? 0);
    setDurationMillis(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
      setActiveTrackId(null);
    }
  }, []);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      void unloadSound();
    };
  }, [unloadSound]);

  const handleTrackPress = useCallback(
    async (track: ShifaAudioTrack) => {
      try {
        setPlaybackError(null);

        if (activeTrackId === track.id && soundRef.current) {
          if (isPlaying) {
            await soundRef.current.pauseAsync();
          } else {
            await soundRef.current.playAsync();
          }
          return;
        }

        await unloadSound();

        setActiveTrackId(track.id);
        setPositionMillis(0);
        setDurationMillis((track.durationSeconds ?? 0) * 1000);

        const { sound } = await Audio.Sound.createAsync(
          { uri: getShifaAudioFileUrl(track.audioFileId) },
          { shouldPlay: true, progressUpdateIntervalMillis: 500 },
          onPlaybackStatusUpdate,
        );

        soundRef.current = sound;
      } catch {
        setPlaybackError("Couldn't start audio. Please try another track.");
        setIsPlaying(false);
        setActiveTrackId(null);
      }
    },
    [activeTrackId, isPlaying, onPlaybackStatusUpdate, unloadSound],
  );

  return (
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={() => {
          void refresh();
        }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 16 }}>
            <View>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size["4xl"],
                  fontWeight: typography.weight.extrabold,
                }}
              >
                Audio
              </Text>
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.md,
                  marginTop: 6,
                  lineHeight: 22,
                }}
              >
                Stream Dars-e-Shifa Shareef recitations from Appwrite.
              </Text>
            </View>

            {activeTrack ? (
              <View
                style={{
                  backgroundColor: colors.primary.deepGreen,
                  borderRadius: 22,
                  padding: 18,
                  gap: 10,
                  ...shadows.md,
                }}
              >
                <Text
                  style={{
                    color: colors.text.light,
                    fontSize: typography.size.xs,
                    fontWeight: typography.weight.bold,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Now Playing
                </Text>
                <Text
                  style={{
                    color: "#FFF9EA",
                    fontSize: typography.size.lg,
                    fontWeight: typography.weight.extrabold,
                  }}
                  numberOfLines={2}
                >
                  {activeTrack.title}
                </Text>
                <View
                  style={{
                    height: 7,
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: "rgba(255, 249, 234, 0.2)",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.round(progressFraction * 100)}%`,
                      backgroundColor: colors.secondary.lightGold,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#C6D4CB",
                      fontSize: typography.size.sm,
                    }}
                  >
                    {formatPlaybackMillis(positionMillis)}
                  </Text>
                  <Text
                    style={{
                      color: "#C6D4CB",
                      fontSize: typography.size.sm,
                    }}
                  >
                    {formatPlaybackMillis(durationMillis)}
                  </Text>
                </View>
              </View>
            ) : null}

            {playbackError ? (
              <View
                style={{
                  borderRadius: 14,
                  backgroundColor: isDark
                    ? "rgba(220, 53, 69, 0.22)"
                    : "rgba(220, 53, 69, 0.12)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.accent.error,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.semibold,
                  }}
                >
                  {playbackError}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              backgroundColor: cardBackground,
              borderRadius: 18,
              borderWidth: isDark ? 1 : 0,
              borderColor: cardBorderColor,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              ...shadows.sm,
            }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color={colors.secondary.mutedGold} />
                <Text
                  style={{
                    color: colors.text.tertiary,
                    fontSize: typography.size.sm,
                  }}
                >
                  Loading Shifa Shareef audio...
                </Text>
              </>
            ) : error ? (
              <>
                <Text
                  style={{
                    color: colors.accent.error,
                    fontSize: typography.size.sm,
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
                <Pressable
                  onPress={() => {
                    void refresh();
                  }}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    backgroundColor: colors.secondary.lightGold,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: colors.primary.deepGreen,
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.extrabold,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.sm,
                }}
              >
                No Shifa audio tracks found.
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{
          paddingTop: insets.top + 5,
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const isActive = item.id === activeTrackId;

          return (
            <Pressable
              onPress={() => {
                void handleTrackPress(item);
              }}
              style={({ pressed }) => ({
                backgroundColor: isActive ? activeCardBackground : cardBackground,
                borderRadius: 18,
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? cardBorderColor : "transparent",
                padding: 14,
                gap: 10,
                opacity: pressed ? 0.86 : 1,
                ...shadows.sm,
              })}
            >
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: isActive
                      ? colors.primary.deepGreen
                      : isDark
                        ? "rgba(241, 224, 164, 0.12)"
                        : "rgba(201, 169, 97, 0.16)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={isActive && isPlaying ? "pause" : "play"}
                    size={18}
                    color={
                      isActive
                        ? colors.secondary.lightGold
                        : colors.secondary.mutedGold
                    }
                  />
                </View>

                <View style={{ flex: 1, gap: 5 }}>
                  <Text
                    style={{
                      color: colors.text.primary,
                      fontSize: typography.size.md,
                      fontWeight: typography.weight.bold,
                      lineHeight: 21,
                    }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.text.tertiary,
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.medium,
                    }}
                  >
                    {formatDuration(item.durationSeconds)} •{" "}
                    {formatUploadDate(item.uploadedAt)}
                  </Text>
                </View>
              </View>

              {isActive ? (
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 999,
                      overflow: "hidden",
                      backgroundColor: progressTrackColor,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.round(progressFraction * 100)}%`,
                        backgroundColor: colors.secondary.mutedGold,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text.subtle,
                        fontSize: typography.size.xs,
                      }}
                    >
                      {formatPlaybackMillis(positionMillis)}
                    </Text>
                    <Text
                      style={{
                        color: colors.text.subtle,
                        fontSize: typography.size.xs,
                      }}
                    >
                      {formatPlaybackMillis(durationMillis)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
