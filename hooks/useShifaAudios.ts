import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchShifaAudioTracks,
  fetchStaticFallbackTracks,
  loadCachedAudioTracks,
  saveCachedAudioTracks,
  type ShifaAudioTrack,
} from "../lib/shifa-audio-service";

const DEFAULT_ERROR_MESSAGE =
  "Unable to load audio right now. Please check your internet and try again.";

export function useShifaAudios(limit: number = 120) {
  const [tracks, setTracks] = useState<ShifaAudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Serve cached data first — avoids a DB read on every open
      const cached = await loadCachedAudioTracks();
      if (cancelled) return;
      if (cached) {
        hasDataRef.current = true;
        setTracks(cached);
        setIsLoading(false);
      }

      // 2. Fetch fresh data in background
      try {
        const fresh = await fetchShifaAudioTracks(limit);
        if (cancelled) return;
        hasDataRef.current = true;
        setTracks(fresh);
        setError(null);
        void saveCachedAudioTracks(fresh);
      } catch {
        if (cancelled) return;

        // 3. Static fallback — try CDN-hosted export when Appwrite fails
        if (!hasDataRef.current) {
          const fallback = await fetchStaticFallbackTracks();
          if (cancelled) return;
          if (fallback) {
            hasDataRef.current = true;
            setTracks(fallback);
            setError(null);
            void saveCachedAudioTracks(fallback);
          } else {
            setError(DEFAULT_ERROR_MESSAGE);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const fresh = await fetchShifaAudioTracks(limit);
      hasDataRef.current = true;
      setTracks(fresh);
      void saveCachedAudioTracks(fresh);
    } catch {
      // Try static fallback on refresh error
      const fallback = await fetchStaticFallbackTracks();
      if (fallback) {
        hasDataRef.current = true;
        setTracks(fallback);
        void saveCachedAudioTracks(fallback);
      } else {
        setError(DEFAULT_ERROR_MESSAGE);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [limit]);

  return {
    tracks,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
