import { useCallback, useEffect, useState } from "react";

import {
  fetchShifaAudioTracks,
  type ShifaAudioTrack,
} from "../lib/shifa-audio-service";

const DEFAULT_ERROR_MESSAGE =
  "Unable to load audio right now. Please check your internet and try again.";

export function useShifaAudios(limit: number = 120) {
  const [tracks, setTracks] = useState<ShifaAudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracks = useCallback(async () => {
    try {
      const nextTracks = await fetchShifaAudioTracks(limit);
      setTracks(nextTracks);
      setError(null);
    } catch {
      setError(DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTracks();
  }, [loadTracks]);

  return {
    tracks,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
