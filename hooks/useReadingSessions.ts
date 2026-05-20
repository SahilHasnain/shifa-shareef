import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_VOLUME_ID } from "../data/volumes";
import type { ReadingSession } from "../data/types";

const STORAGE_KEY = "shifa-shareef:reading-sessions";

export type { ReadingSession } from "../data/types";

type SessionsData = {
  sessions: ReadingSession[];
  lastSessionDate: string | null;
};

export function useReadingSessions() {
  const [data, setData] = useState<SessionsData>({
    sessions: [],
    lastSessionDate: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SessionsData;
        setData(parsed);
      }
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const addSession = async (
    session: Omit<ReadingSession, "id" | "volumeId"> & { volumeId?: string },
  ) => {
    const newSession: ReadingSession = {
      ...session,
      id: Date.now().toString(),
      volumeId: session.volumeId ?? DEFAULT_VOLUME_ID,
    };

    const updated: SessionsData = {
      sessions: [newSession, ...data.sessions].slice(0, 100),
      lastSessionDate: session.date,
    };

    setData(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Calculate current streak (consecutive days with reading)
  const getCurrentStreak = (): number => {
    if (data.sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique dates (one session per day counts)
    const uniqueDates = Array.from(
      new Set(
        data.sessions.map((s) => {
          const d = new Date(s.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      ),
    ).sort((a, b) => b - a); // Sort descending (newest first)

    if (uniqueDates.length === 0) return 0;

    const mostRecentDate = new Date(uniqueDates[0]);
    const daysSinceLastRead = Math.floor(
      (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Streak broken if more than 1 day since last read
    if (daysSinceLastRead > 1) return 0;

    let streak = 0;
    let expectedDate = today.getTime();

    for (const dateMs of uniqueDates) {
      const diff = Math.floor(
        (expectedDate - dateMs) / (1000 * 60 * 60 * 24),
      );

      if (diff === 0 || diff === 1) {
        streak++;
        expectedDate = dateMs;
      } else {
        break;
      }
    }

    return streak;
  };

  // Get total sessions count
  const getTotalSessions = (): number => {
    return data.sessions.length;
  };

  // Get sessions from last 7 days
  const getRecentSessions = (days: number = 7): ReadingSession[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    return data.sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      return sessionDate >= cutoffDate;
    });
  };

  // Check if user read today
  const hasReadToday = (): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data.sessions.some((s) => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  };

  const getSessionsForVolume = (volumeId: string): ReadingSession[] => {
    return data.sessions.filter((session) => session.volumeId === volumeId);
  };

  return {
    sessions: data.sessions,
    isLoaded,
    addSession,
    getCurrentStreak,
    getTotalSessions,
    getRecentSessions,
    getSessionsForVolume,
    hasReadToday,
  };
}
