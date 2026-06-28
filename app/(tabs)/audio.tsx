import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, PanResponder, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, typography } from "../../constants/theme";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useShifaAudios } from "../../hooks/useShifaAudios";
import {
  getShifaAudioFileUrl,
  type ShifaAudioTrack,
} from "../../lib/shifa-audio-service";
import {
  loadAllAudioProgress,
  saveAudioProgress,
  resetAudioProgress,
  type AudioProgress,
} from "../../lib/audio-progress-storage";
import {
  downloadTrack,
  deleteDownloadedTrack,
  getDownloadedTracksInfo,
  getLocalAudioUri,
} from "../../lib/audio-download-service";

type SubTab = "library" | "live";

// Custom Slider Component
function CustomSlider({
  value,
  onValueChange,
  onSlidingComplete,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
}: {
  value: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderWidthRef = useRef(0);
  const localValueRef = useRef(value);
  const grantXRef = useRef(0);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
      localValueRef.current = value;
    }
  }, [value, isDragging]);

  const valueFromX = useCallback((x: number) => {
    const width = sliderWidthRef.current;
    if (width <= 0) return localValueRef.current;
    return Math.max(0, Math.min(1, x / width));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        grantXRef.current = evt.nativeEvent.locationX;
        const newValue = valueFromX(grantXRef.current);
        localValueRef.current = newValue;
        setLocalValue(newValue);
        onValueChange?.(newValue);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState) => {
        const newValue = valueFromX(grantXRef.current + gestureState.dx);
        localValueRef.current = newValue;
        setLocalValue(newValue);
        onValueChange?.(newValue);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        onSlidingComplete(localValueRef.current);
      },
    })
  ).current;

  const trackPadding = 8;

  return (
    <View
      style={{ height: 40, justifyContent: "center" }}
      onLayout={(e) => { sliderWidthRef.current = e.nativeEvent.layout.width - trackPadding * 2; }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: 4,
          backgroundColor: maximumTrackTintColor,
          borderRadius: 2,
          overflow: "hidden",
          marginHorizontal: trackPadding,
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${localValue * 100}%`,
            backgroundColor: minimumTrackTintColor,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: `${localValue * 100}%`,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: thumbTintColor,
          marginLeft: -8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }}
      />
    </View>
  );
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

export default function AudioScreen() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useAppTheme();
  const { tracks, isLoading, isRefreshing, error, refresh } = useShifaAudios();
  const playerRef = useRef<AudioPlayer | null>(null);
  const statusSubscriptionRef = useRef<ReturnType<AudioPlayer["addListener"]> | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>("library");
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPositionMillis, setSeekPositionMillis] = useState(0);
  const [audioProgress, setAudioProgress] = useState<Record<string, AudioProgress>>({});
  const lastSavedPositionRef = useRef<number>(0);
  const pendingSeekRef = useRef<number | null>(null);
  const activeTrackIdRef = useRef<string | null>(null);
  const startTokenRef = useRef(0);
  const downloadedIdsRef = useRef<Set<string>>(new Set());
  const downloadingIdsRef = useRef<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const isDark = resolvedTheme === "dark";
  const screenBackground = isDark ? "#0B100D" : colors.surface.lightCream;
  const cardBackground = isDark ? "#1A2520" : colors.surface.warmIvory;
  const activeCardBackground = isDark ? "#23302A" : "#F8F0D8";
  const cardBorderColor = isDark ? "rgba(241, 224, 164, 0.09)" : "transparent";
  const softPanelBackground = isDark ? "rgba(255, 249, 234, 0.05)" : "rgba(255, 249, 234, 0.72)";
  const mutedGoldSurface = isDark ? "rgba(201, 169, 97, 0.14)" : "rgba(201, 169, 97, 0.18)";
  const tabInactiveBackground = isDark ? "rgba(255, 249, 234, 0.07)" : "rgba(23, 61, 49, 0.06)";
  const tabInactiveBorder = isDark ? "rgba(241, 224, 164, 0.12)" : "rgba(23, 61, 49, 0.14)";
  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === activeTrackId) ?? null,
    [activeTrackId, tracks],
  );
  const progressFraction =
    durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  const unloadSound = useCallback(async () => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    statusSubscriptionRef.current?.remove();
    statusSubscriptionRef.current = null;
    playerRef.current = null;
    activeTrackIdRef.current = null;
    pendingSeekRef.current = null;

    try {
      player.pause();
    } catch {
      // ignore pause errors during teardown
    }

    try {
      player.remove();
    } catch {
      // ignore removal errors during teardown
    }
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AudioStatus) => {
    if (!status.isLoaded) {
      return;
    }

    if (!isSeeking) {
      setPositionMillis(Math.floor(status.currentTime * 1000));
    }
    setDurationMillis(Math.floor(status.duration * 1000));
    setIsPlaying(status.playing);

    const currentTrackId = activeTrackIdRef.current;

    if (currentTrackId && status.duration > 0) {
      const posMs = Math.floor(status.currentTime * 1000);
      const durMs = Math.floor(status.duration * 1000);

      // Throttled save — persist every ~3 seconds of movement
      if (Math.abs(posMs - lastSavedPositionRef.current) > 3000) {
        lastSavedPositionRef.current = posMs;
        const percent = durMs > 0 ? posMs / durMs : 0;
        void saveAudioProgress(currentTrackId, {
          positionMillis: posMs,
          durationMillis: durMs,
          progressPercent: Math.min(1, percent),
          updatedAt: new Date().toISOString(),
        }).then(() => {
          setAudioProgress((prev) => ({
            ...prev,
            [currentTrackId]: {
              positionMillis: posMs,
              durationMillis: durMs,
              progressPercent: Math.min(1, percent),
              updatedAt: new Date().toISOString(),
            },
          }));
        });
      }
    }

    // Pending seek from resume
    if (pendingSeekRef.current != null && status.currentTime >= 0) {
      const seekTo = pendingSeekRef.current;
      pendingSeekRef.current = null;
      playerRef.current?.seekTo(seekTo / 1000).catch(() => {});
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
      setActiveTrackId(null);
      activeTrackIdRef.current = null;
      if (currentTrackId) {
        void resetAudioProgress(currentTrackId);
        setAudioProgress((prev) => {
          const next = { ...prev };
          delete next[currentTrackId];
          return next;
        });
      }
    }
  }, [isSeeking]);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
      shouldPlayInBackground: false,
    }).catch(() => { });
  }, []);

  useEffect(() => {
    void loadAllAudioProgress().then(setAudioProgress);
  }, []);

  useEffect(() => {
    void getDownloadedTracksInfo().then((map) => {
      const ids = new Set(Object.keys(map));
      downloadedIdsRef.current = ids;
      setDownloadedIds(ids);
    });
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

        if (activeTrackId === track.id && playerRef.current) {
          if (isPlaying) {
            setIsPlaying(false);
            playerRef.current.pause();
          } else {
            setIsPlaying(true);
            playerRef.current.play();
          }
          return;
        }

        const startToken = startTokenRef.current + 1;
        startTokenRef.current = startToken;
        await unloadSound();

        if (startToken !== startTokenRef.current) {
          return;
        }

        setActiveTrackId(track.id);
        activeTrackIdRef.current = track.id;
        const saved = audioProgress[track.id];
        const startPositionMs = saved?.positionMillis ?? 0;
        setPositionMillis(startPositionMs);
        setDurationMillis((track.durationSeconds ?? 0) * 1000);

        const audioUri =
          (await getLocalAudioUri(track.id)) ?? getShifaAudioFileUrl(track.audioFileId);

        const player = createAudioPlayer(
          { uri: audioUri },
          { updateInterval: 250 },
        );
        statusSubscriptionRef.current = player.addListener("playbackStatusUpdate", onPlaybackStatusUpdate);
        playerRef.current = player;

        if (startToken !== startTokenRef.current) {
          player.pause();
          player.remove();
          return;
        }

        setIsPlaying(true);
        player.play();

        if (startPositionMs > 0) {
          pendingSeekRef.current = startPositionMs;
        }
      } catch {
        setPlaybackError("Couldn't start audio. Please try another track.");
        setIsPlaying(false);
        setActiveTrackId(null);
        activeTrackIdRef.current = null;
      }
    },
    [activeTrackId, isPlaying, onPlaybackStatusUpdate, unloadSound, audioProgress],
  );

  const handleLiveStreamToggle = useCallback(async () => {
    try {
      setPlaybackError(null);

      if (isLiveStreaming && playerRef.current) {
        if (isPlaying) {
          setIsPlaying(false);
          playerRef.current.pause();
        } else {
          setIsPlaying(true);
          playerRef.current.play();
        }
        return;
      }

      const startToken = startTokenRef.current + 1;
      startTokenRef.current = startToken;
      await unloadSound();

      if (startToken !== startTokenRef.current) {
        return;
      }

      setActiveTrackId(null);
      activeTrackIdRef.current = null;
      setIsLiveStreaming(true);
      setPositionMillis(0);
      setDurationMillis(0);

      const player = createAudioPlayer(
        { uri: "https://seerat.duckdns.org/live" },
        { updateInterval: 250 },
      );
      statusSubscriptionRef.current = player.addListener("playbackStatusUpdate", onPlaybackStatusUpdate);
      playerRef.current = player;

      if (startToken !== startTokenRef.current) {
        player.pause();
        player.remove();
        return;
      }

      setIsPlaying(true);
      player.play();
    } catch {
      setPlaybackError("Couldn't connect to live stream. Please try again.");
      setIsPlaying(false);
      setIsLiveStreaming(false);
      activeTrackIdRef.current = null;
    }
  }, [isLiveStreaming, isPlaying, onPlaybackStatusUpdate, unloadSound]);

  const handleDownloadToggle = useCallback(
    async (track: ShifaAudioTrack) => {
      if (downloadingIdsRef.current.has(track.id)) return;

      const isDownloaded = downloadedIdsRef.current.has(track.id);
      if (isDownloaded) {
        await deleteDownloadedTrack(track.id);
        downloadedIdsRef.current = new Set(downloadedIdsRef.current);
        downloadedIdsRef.current.delete(track.id);
        setDownloadedIds(new Set(downloadedIdsRef.current));
      } else {
        downloadingIdsRef.current = new Set(downloadingIdsRef.current);
        downloadingIdsRef.current.add(track.id);
        setDownloadingIds(new Set(downloadingIdsRef.current));
        const result = await downloadTrack(track);
        downloadingIdsRef.current = new Set(downloadingIdsRef.current);
        downloadingIdsRef.current.delete(track.id);
        setDownloadingIds(new Set(downloadingIdsRef.current));
        if (result) {
          downloadedIdsRef.current = new Set(downloadedIdsRef.current);
          downloadedIdsRef.current.add(track.id);
          setDownloadedIds(new Set(downloadedIdsRef.current));
        }
      }
    },
    [],
  );

  const handleSeek = useCallback(async (value: number) => {
    if (playerRef.current && durationMillis > 0) {
      try {
        const seekPosition = Math.floor(value * durationMillis);
        setSeekPositionMillis(seekPosition);
        setPositionMillis(seekPosition);
        setIsSeeking(false);
        await playerRef.current.seekTo(seekPosition / 1000);
      } catch (error) {
        console.error("Seek error:", error);
        setIsSeeking(false);
      }
    }
  }, [durationMillis]);

  const handleSeekDrag = useCallback((value: number) => {
    setIsSeeking(true);
    setSeekPositionMillis(Math.floor(value * durationMillis));
  }, [durationMillis]);

  const displayedPositionMillis = isSeeking ? seekPositionMillis : positionMillis;
  const expandedProgressFraction =
    durationMillis > 0 ? Math.min(displayedPositionMillis / durationMillis, 1) : 0;

  const handleSkipBackward = useCallback(async () => {
    if (playerRef.current && durationMillis > 0) {
      try {
        const newPosition = Math.max(0, positionMillis - 15000);
        setPositionMillis(newPosition);
        await playerRef.current.seekTo(newPosition / 1000);
      } catch (error) {
        console.error("Skip backward error:", error);
      }
    }
  }, [positionMillis, durationMillis]);

  const handleSkipForward = useCallback(async () => {
    if (playerRef.current && durationMillis > 0) {
      try {
        const newPosition = Math.min(durationMillis, positionMillis + 15000);
        setPositionMillis(newPosition);
        await playerRef.current.seekTo(newPosition / 1000);
      } catch (error) {
        console.error("Skip forward error:", error);
      }
    }
  }, [positionMillis, durationMillis]);

  return (
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ marginBottom: 18, gap: 6 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.size["4xl"],
              fontWeight: typography.weight.extrabold,
              letterSpacing: -0.5,
            }}
          >
            Listen
          </Text>
          <Text
            style={{
              color: colors.text.tertiary,
              fontSize: typography.size.sm,
              fontWeight: typography.weight.medium,
            }}
          >
            Dars e Shifa episodes and live stream
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            borderRadius: 22,
            padding: 5,
          }}
        >
          <Pressable
            onPress={() => setActiveTab("library")}
            style={({ pressed }) => ({
              flex: 1,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: "100%",
                backgroundColor:
                  activeTab === "library"
                    ? "#173D31"
                    : tabInactiveBackground,
                borderWidth: 1,
                borderColor: activeTab === "library" ? "#173D31" : tabInactiveBorder,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 17,
              }}
            >
              <Text
                style={{
                  color:
                    activeTab === "library"
                      ? "#FFF9EA"
                      : colors.text.secondary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.semibold,
                  textAlign: "center",
                }}
              >
                Library
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("live")}
            style={({ pressed }) => ({
              flex: 1,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: "100%",
                backgroundColor:
                  activeTab === "live"
                    ? "#173D31"
                    : tabInactiveBackground,
                borderWidth: 1,
                borderColor: activeTab === "live" ? "#173D31" : tabInactiveBorder,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 17,
              }}
            >
              <Text
                style={{
                  color:
                    activeTab === "live"
                      ? "#FFF9EA"
                      : colors.text.secondary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.semibold,
                  textAlign: "center",
                }}
              >
                Live Stream
              </Text>
            </View>
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
            <View style={{ gap: 14, marginBottom: 14, paddingHorizontal: 20 }}>
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
                    Couldn&apos;t load audio. Please try again.
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
            paddingBottom: activeTrack ? 150 : 96,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const isActive = item.id === activeTrackId;
            const isThisPlaying = isActive && isPlaying;

            return (
              <Pressable
                onPress={() => {
                  void handleTrackPress(item);
                }}
                style={({ pressed }) => ({
                  backgroundColor: isActive ? activeCardBackground : cardBackground,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: isActive
                    ? colors.secondary.mutedGold
                    : isDark
                      ? cardBorderColor
                      : "rgba(23, 61, 49, 0.05)",
                  padding: 12,
                  opacity: pressed ? 0.86 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                  ...shadows.md,
                })}
              >
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 18,
                      backgroundColor: isActive
                        ? colors.primary.deepGreen
                        : isDark
                          ? "rgba(241, 224, 164, 0.10)"
                          : mutedGoldSurface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={isThisPlaying ? "pause" : "play"}
                      size={22}
                      color={
                        isActive
                          ? colors.secondary.lightGold
                          : colors.secondary.mutedGold
                      }
                    />
                  </View>

                  <View style={{ flex: 1, gap: 7 }}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        fontSize: typography.size.base,
                        fontWeight: typography.weight.bold,
                        lineHeight: 20,
                      }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                  </View>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      void handleDownloadToggle(item);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                      padding: 4,
                    })}
                  >
                    <Ionicons
                      name={
                        downloadingIds.has(item.id)
                          ? "sync-circle"
                          : downloadedIds.has(item.id)
                            ? "checkmark-circle"
                            : "cloud-download-outline"
                      }
                      size={20}
                      color={
                        downloadingIds.has(item.id)
                          ? colors.secondary.mutedGold
                          : downloadedIds.has(item.id)
                            ? colors.secondary.mutedGold
                            : isActive
                              ? colors.secondary.mutedGold
                              : colors.text.subtle
                      }
                    />
                  </Pressable>
                </View>

                {!isActive && audioProgress[item.id]?.progressPercent > 0 && (
                  <View
                    style={{
                      marginTop: 10,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: mutedGoldSurface,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.round((audioProgress[item.id]?.progressPercent ?? 0) * 100)}%`,
                        backgroundColor: colors.secondary.mutedGold,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingBottom: 92 }}>
          <View
            style={{
              width: "100%",
              borderRadius: 32,
              backgroundColor: cardBackground,
              borderWidth: 1,
              borderColor: cardBorderColor,
              paddingHorizontal: 22,
              paddingVertical: 34,
              alignItems: "center",
              gap: 34,
              ...shadows.lg,
            }}
          >
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
                  width: 108,
                  height: 108,
                  borderRadius: 54,
                  backgroundColor: colors.primary.deepGreen,
                  borderWidth: isDark ? 1 : 2,
                  borderColor: isDark ? "rgba(241, 224, 164, 0.18)" : colors.secondary.lightGold,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.86 : 1,
                  ...shadows.lg,
                })}
              >
                <Ionicons
                  name={isLiveStreaming && isPlaying ? "pause" : "play"}
                  size={46}
                  color={colors.secondary.lightGold}
                />
              </Pressable>
            </View>

            <View style={{ alignItems: "center", gap: 10, paddingTop: isLiveStreaming && isPlaying ? 22 : 0 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: isLiveStreaming && isPlaying ? "rgba(220, 53, 69, 0.14)" : mutedGoldSurface,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
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
                    color: isLiveStreaming && isPlaying ? colors.accent.error : colors.text.tertiary,
                    fontSize: typography.size.xs,
                    fontWeight: typography.weight.bold,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  {isLiveStreaming && isPlaying ? "On Air" : "Live Stream"}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: typography.size["3xl"],
                  fontWeight: typography.weight.extrabold,
                  textAlign: "center",
                  letterSpacing: -0.3,
                }}
              >
                Shifa Shareef Live
              </Text>

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
        <>
          {/* Mini Player */}
          <Pressable
            onPress={() => setIsPlayerExpanded(true)}
            style={{
              position: "absolute",
              bottom: insets.bottom + 82,
              left: 14,
              right: 14,
              backgroundColor: colors.primary.deepGreen,
              borderRadius: 22,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: "rgba(241, 224, 164, 0.18)",
              ...shadows.lg,
            }}
          >
            <Pressable
              onPress={async (e) => {
                e.stopPropagation();
                if (activeTrack) {
                  await handleTrackPress(activeTrack);
                }
              }}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 17,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#000000",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color="#000000"
              />
            </Pressable>

            <View style={{ flex: 1, gap: 4 }}>
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
                    color: "rgba(255, 249, 234, 0.72)",
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
                  backgroundColor: "rgba(255, 249, 234, 0.18)",
                  borderBottomLeftRadius: 22,
                  borderBottomRightRadius: 22,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round(progressFraction * 100)}%`,
                    backgroundColor: colors.secondary.lightGold,
                    borderBottomLeftRadius: 22,
                  }}
                />
              </View>
            )}
          </Pressable>

          {/* Expanded Player Modal */}
          <Modal
            visible={isPlayerExpanded}
            transparent
            animationType="slide"
            onRequestClose={() => setIsPlayerExpanded(false)}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                justifyContent: "flex-end",
              }}
              onPress={() => setIsPlayerExpanded(false)}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: isDark ? "#1A2520" : colors.surface.warmIvory,
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  paddingTop: 24,
                  paddingBottom: insets.bottom + 24,
                  paddingHorizontal: 24,
                  ...shadows.lg,
                }}
              >
                {/* Handle bar */}
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: isDark
                      ? "rgba(241, 224, 164, 0.2)"
                      : "rgba(201, 169, 97, 0.3)",
                    borderRadius: 2,
                    alignSelf: "center",
                    marginBottom: 32,
                  }}
                />

                {/* Album Art / Icon */}
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 20,
                    backgroundColor: colors.primary.deepGreen,
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    marginBottom: 24,
                    ...shadows.md,
                  }}
                >
                  <Ionicons
                    name="musical-notes"
                    size={60}
                    color={colors.secondary.lightGold}
                  />
                </View>

                {/* Track Info */}
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: typography.size.xl,
                    fontWeight: typography.weight.extrabold,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                  numberOfLines={2}
                >
                  {activeTrack?.title}
                </Text>

                {/* Slider */}
                {durationMillis > 0 && (
                  <View style={{ marginTop: 24, gap: 8 }}>
                    <CustomSlider
                      value={expandedProgressFraction}
                      onValueChange={handleSeekDrag}
                      onSlidingComplete={handleSeek}
                      minimumTrackTintColor={colors.secondary.mutedGold}
                      maximumTrackTintColor={
                        isDark
                          ? "rgba(241, 224, 164, 0.2)"
                          : "rgba(201, 169, 97, 0.2)"
                      }
                      thumbTintColor={colors.secondary.lightGold}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text.tertiary,
                          fontSize: typography.size.xs,
                        }}
                      >
                        {formatPlaybackMillis(displayedPositionMillis)}
                      </Text>
                      <Text
                        style={{
                          color: colors.text.tertiary,
                          fontSize: typography.size.xs,
                        }}
                      >
                        {formatPlaybackMillis(durationMillis)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Controls */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 32,
                    marginTop: 32,
                  }}
                >
                  {/* Skip backward */}
                  <Pressable
                    onPress={handleSkipBackward}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons
                      name="play-back"
                      size={36}
                      color={colors.text.secondary}
                    />
                  </Pressable>

                  {/* Play/Pause */}
                  <Pressable
                    onPress={async () => {
                      if (activeTrack) {
                        await handleTrackPress(activeTrack);
                      }
                    }}
                    style={({ pressed }) => ({
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: colors.primary.deepGreen,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: colors.secondary.lightGold,
                      opacity: pressed ? 0.86 : 1,
                      ...shadows.md,
                    })}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={36}
                      color={colors.secondary.lightGold}
                    />
                  </Pressable>

                  {/* Skip forward */}
                  <Pressable
                    onPress={handleSkipForward}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons
                      name="play-forward"
                      size={36}
                      color={colors.text.secondary}
                    />
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </View>
  );
}
