import { useCallback, useEffect, useRef } from "react";

import { getLanguageById } from "../data/languages";
import { resolvePreferredLanguage } from "../lib/preferred-language";
import {
  downloadVolume,
  getVolumeDownloadState,
} from "../lib/volume-download-service";
import { useReadingSessions } from "./useReadingSessions";

/**
 * Watches reading history and, once the user preferentially reads in a
 * language (>= 2 sessions or >= 2 distinct days), silently downloads all of
 * that language's volumes so it works fully offline on mobile data too.
 * Downloads are idempotent per app run and never re-triggered while already
 * complete or in flight.
 */
export function useAutoDownload() {
  const { sessions, isLoaded } = useReadingSessions();
  const attemptedRef = useRef(new Set<string>());
  const inflightRef = useRef(new Set<string>());

  const ensureVolume = useCallback(
    async (languageId: string, volumeId: string, key: string) => {
      if (
        attemptedRef.current.has(key) ||
        inflightRef.current.has(key)
      ) {
        return;
      }

      try {
        const state = await getVolumeDownloadState(languageId, volumeId);
        if (state.status === "complete") {
          attemptedRef.current.add(key);
          return;
        }
        inflightRef.current.add(key);
        await downloadVolume(languageId, volumeId);
      } catch {
      } finally {
        inflightRef.current.delete(key);
        attemptedRef.current.add(key);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isLoaded) return;

    const preferred = resolvePreferredLanguage(sessions);
    if (!preferred) return;

    const language = getLanguageById(preferred.languageId);
    for (const volume of language.volumes) {
      const key = `${preferred.languageId}:${volume.id}`;
      void ensureVolume(preferred.languageId, volume.id, key);
    }
  }, [isLoaded, sessions, ensureVolume]);
}