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

type SubTab = "library" | "live";

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
  const [activeTab, setActiveTab] = useState<SubTab>("library");
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);

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
    }).catch(() => { });
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
        setIsLiveStreaming(false);

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

  const handleLiveStreamToggle = useCallback(async () => {
    try {
      setPlaybackError(null);

      if (isLiveStreaming && soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
        return;
      }

      await unloadSound();
      setActiveTrackId(null);
      setIsLiveStreaming(true);
      setPositionMillis(0);
      setDurationMillis(0);

      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://seerat.duckdns.org/live" },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate,
      );

      soundRef.current = sound;
    } catch {
      setPlaybackError("Couldn't connect to live stream. Please try again.");
      setIsPlaying(false);
      setIsLiveStreaming(false);
    }
  }, [isLiveStreaming, isPlaying, onPlaybackStatusUpdate, unloadSound]);

  return (
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        {/* Spotify-style Subtabs */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Pressable
            onPress={() => setActiveTab("library")}
            style={{
              backgroundColor:
                activeTab === "library"
                  ? colors.primary.deepGreen
                  : cardBackground,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              ...shadows.md,
            }}
          >
            <Text
              style={{
                color:
                  activeTab === "library"
                    ? colors.text.onPrimary
                    : colors.text.secondary,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold,
              }}
            >
              Library
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("live")}
            style={{
              backgroundColor:
                activeTab === "live"
                  ? colors.primary.deepGreen
                  : cardBackground,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              ...shadows.md,
            }}
          >
            <Text
              style={{
                color:
                  activeTab === "live"
                    ? colors.text.onPrimary
                    : colors.text.secondary,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold,
              }}
            >
              Live Stream
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === "library" ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => {
            void refresh();
          }}
          ListHeaderComponent={
            <View style={{ gap: 14, marginBottom: 16, paddingHorizontal: 20 }}>
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
                    Loading audio...
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
                    Couldn't load audio. Please try again.
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
                  No audio found.
                </Text>
              )}
            </View>
          }
          contentContainerStyle={{
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
                  borderRadius: 16,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? cardBorderColor : "transparent",
                  padding: 16,
                  gap: 12,
                  opacity: pressed ? 0.86 : 1,
                  ...shadows.sm,
                })}
              >
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
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
                      size={20}
                      color={
                        isActive
                          ? colors.secondary.lightGold
                          : colors.secondary.mutedGold
                      }
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
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
                      }}
                    >
                      {formatDuration(item.durationSeconds)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{ alignItems: "center", gap: 40 }}>
            {/* Radio Visual */}
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              {/* Radio wave arcs when paused */}
              {!(isLiveStreaming && isPlaying) && (
                <>
                  <View
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 40,
                      height: 40,
                      borderTopRightRadius: 40,
                      borderTopWidth: 2,
                      borderRightWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.2)"
                        : "rgba(201, 169, 97, 0.3)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: -20,
                      left: -20,
                      width: 40,
                      height: 40,
                      borderTopLeftRadius: 40,
                      borderTopWidth: 2,
                      borderLeftWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.2)"
                        : "rgba(201, 169, 97, 0.3)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: -20,
                      right: -20,
                      width: 40,
                      height: 40,
                      borderBottomRightRadius: 40,
                      borderBottomWidth: 2,
                      borderRightWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.2)"
                        : "rgba(201, 169, 97, 0.3)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: -20,
                      left: -20,
                      width: 40,
                      height: 40,
                      borderBottomLeftRadius: 40,
                      borderBottomWidth: 2,
                      borderLeftWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.2)"
                        : "rgba(201, 169, 97, 0.3)",
                    }}
                  />
                </>
              )}

              {/* Full wave circles when playing */}
              {isLiveStreaming && isPlaying && (
                <>
                  <View
                    style={{
                      position: "absolute",
                      width: 140,
                      height: 140,
                      borderRadius: 70,
                      borderWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.2)"
                        : "rgba(201, 169, 97, 0.3)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      width: 180,
                      height: 180,
                      borderRadius: 90,
                      borderWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.12)"
                        : "rgba(201, 169, 97, 0.2)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      width: 220,
                      height: 220,
                      borderRadius: 110,
                      borderWidth: 2,
                      borderColor: isDark
                        ? "rgba(241, 224, 164, 0.06)"
                        : "rgba(201, 169, 97, 0.12)",
                    }}
                  />
                </>
              )}

              {/* Center button */}
              <Pressable
                onPress={() => {
                  void handleLiveStreamToggle();
                }}
                style={({ pressed }) => ({
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: colors.primary.deepGreen,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.86 : 1,
                  ...shadows.lg,
                })}
              >
                <Ionicons
                  name={isLiveStreaming && isPlaying ? "pause" : "play"}
                  size={44}
                  color={colors.text.onPrimary}
                />
              </Pressable>
            </View>

            <View style={{ alignItems: "center", gap: 8, paddingTop: isLiveStreaming && isPlaying ? 26 : 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {/* Live indicator dot */}
                {isLiveStreaming && isPlaying && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#FF4444",
                    }}
                  />
                )}

                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: typography.size["3xl"],
                    fontWeight: typography.weight.extrabold,
                    textAlign: "center",
                  }}
                >
                  Shifa Shareef Live
                </Text>
              </View>
            </View>

            {playbackError ? (
              <Text
                style={{
                  color: colors.accent.error,
                  fontSize: typography.size.sm,
                  textAlign: "center",
                }}
              >
                {playbackError}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Floating Mini Player */}
      {activeTrack && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 16,
            left: 20,
            right: 20,
            backgroundColor: colors.primary.deepGreen,
            borderRadius: 16,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            ...shadows.lg,
          }}
        >
          <Pressable
            onPress={async () => {
              if (activeTrack) {
                await handleTrackPress(activeTrack);
              }
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.secondary.lightGold,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color={colors.primary.deepGreen}
            />
          </Pressable>

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: colors.text.onPrimary,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.bold,
              }}
              numberOfLines={1}
            >
              {activeTrack?.title}
            </Text>
            {durationMillis > 0 && (
              <Text
                style={{
                  color: colors.text.light,
                  fontSize: typography.size.xs,
                }}
              >
                {formatPlaybackMillis(positionMillis)} / {formatPlaybackMillis(durationMillis)}
              </Text>
            )}
          </View>

          {durationMillis > 0 && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: "rgba(255, 249, 234, 0.2)",
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.round(progressFraction * 100)}%`,
                  backgroundColor: colors.secondary.lightGold,
                  borderBottomLeftRadius: 16,
                }}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
