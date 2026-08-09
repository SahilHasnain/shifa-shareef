import type { ReadingSession } from "../data/types";

export const MIN_PREFERRED_SESSIONS = 2;

export type PreferredLanguage = {
  languageId: string;
  totalPages: number;
  sessionCount: number;
  distinctDays: number;
  lastReadAt: string;
};

/**
 * Resolves the language the user actually prefers reading in, based on
 * recorded reading sessions. A language only counts as preferred once the
 * user has engaged enough to cross the threshold (>= MIN_PREFERRED_SESSIONS
 * sessions OR >= 2 distinct days). Brief exploration does not trigger a
 * preference. Returns null when no language qualifies yet.
 */
export function resolvePreferredLanguage(
  sessions: ReadingSession[],
): PreferredLanguage | null {
  if (sessions.length === 0) return null;

  const sessionsByLanguage = new Map<string, ReadingSession[]>();
  for (const session of sessions) {
    const list = sessionsByLanguage.get(session.languageId) ?? [];
    list.push(session);
    sessionsByLanguage.set(session.languageId, list);
  }

  let best: PreferredLanguage | null = null;
  let bestRecency = "";

  for (const [languageId, list] of sessionsByLanguage) {
    const distinctDays = new Set(
      list.map((session) => session.date.slice(0, 10)),
    ).size;

    if (list.length < MIN_PREFERRED_SESSIONS && distinctDays < 2) continue;

    const totalPages = list.reduce(
      (sum, session) => sum + (session.pagesRead || 0),
      0,
    );
    const lastReadAt = list.reduce(
      (latest, session) => (session.date > latest ? session.date : latest),
      "",
    );

    const isBetter =
      best == null ||
      totalPages > best.totalPages ||
      (totalPages === best.totalPages && list.length > best.sessionCount) ||
      (totalPages === best.totalPages &&
        list.length === best.sessionCount &&
        lastReadAt > bestRecency);

    if (isBetter) {
      best = {
        languageId,
        totalPages,
        sessionCount: list.length,
        distinctDays,
        lastReadAt,
      };
      bestRecency = lastReadAt;
    }
  }

  return best;
}