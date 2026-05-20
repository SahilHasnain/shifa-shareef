import { useMemo } from "react";

import { useReadingSessions } from "./useReadingSessions";

export function useGlobalStats() {
  const { sessions } = useReadingSessions();

  const totalPagesRead = useMemo(
    () => sessions.reduce((sum, session) => sum + session.pagesRead, 0),
    [sessions],
  );

  const volumeStats = useMemo(() => {
    return sessions.reduce<Record<string, number>>((stats, session) => {
      stats[session.volumeId] = (stats[session.volumeId] ?? 0) + session.pagesRead;
      return stats;
    }, {});
  }, [sessions]);

  return {
    totalPagesRead,
    volumeStats,
  };
}
