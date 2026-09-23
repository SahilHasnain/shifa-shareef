import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";

import type { Section, Volume } from "../data/types";
import { loadBookSections } from "../lib/book-content";

export function useBundledSections(languageId: string, volumes: Volume[]) {
  const database = useSQLiteContext();
  const volumeIdsKey = useMemo(() => volumes.map((volume) => volume.id).join(","), [volumes]);
  const [sectionsByVolume, setSectionsByVolume] = useState<Record<string, Section[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void Promise.all(
      volumes.map(async (volume) => [
        volume.id,
        await loadBookSections(database, languageId, volume),
      ] as const),
    ).then((entries) => {
      if (cancelled) return;
      setSectionsByVolume(Object.fromEntries(entries));
      setIsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setSectionsByVolume({});
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [database, languageId, volumeIdsKey]);

  return { sectionsByVolume, isLoading };
}
