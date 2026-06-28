import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths, Directory } from "expo-file-system";

import { getShifaAudioFileUrl, type ShifaAudioTrack } from "./shifa-audio-service";

const DOWNLOADS_META_KEY = "shifa-shareef:audio-downloads";

type DownloadMeta = {
  trackId: string;
  downloadedAt: string;
};

function getAudioDir(): Directory {
  return new Directory(Paths.document, "audio");
}

function getAudioFile(trackId: string): File {
  return new File(Paths.document, "audio", trackId);
}

export async function getDownloadedTrackIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_META_KEY);
    if (!raw) return new Set();
    const map = JSON.parse(raw) as Record<string, DownloadMeta>;
    return new Set(Object.keys(map));
  } catch {
    return new Set();
  }
}

export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  const ids = await getDownloadedTrackIds();
  return ids.has(trackId);
}

export async function getLocalAudioUri(
  trackId: string,
): Promise<string | null> {
  const ids = await getDownloadedTrackIds();
  if (!ids.has(trackId)) return null;
  const file = getAudioFile(trackId);
  return file.exists ? file.uri : null;
}

function updateDownloadsMeta(
  updater: (prev: Record<string, DownloadMeta>) => Record<string, DownloadMeta>,
): Promise<void> {
  return AsyncStorage.getItem(DOWNLOADS_META_KEY)
    .then((raw) => JSON.parse(raw ?? "{}") as Record<string, DownloadMeta>)
    .then(updater)
    .then((next) => AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(next)))
    .catch(() => {});
}

export async function downloadTrack(
  track: ShifaAudioTrack,
  _onProgress?: (fraction: number) => void,
): Promise<string | null> {
  const remoteUrl = getShifaAudioFileUrl(track.audioFileId);
  const dir = getAudioDir();
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, track.id);

  try {
    const file = await File.downloadFileAsync(remoteUrl, dest, {
      idempotent: true,
    });

    await updateDownloadsMeta((prev) => ({
      ...prev,
      [track.id]: { trackId: track.id, downloadedAt: new Date().toISOString() },
    }));

    return file.uri;
  } catch {
    return null;
  }
}

export async function deleteDownloadedTrack(trackId: string): Promise<void> {
  const file = getAudioFile(trackId);
  if (file.exists) {
    file.delete();
  }
  await updateDownloadsMeta((prev) => {
    const next = { ...prev };
    delete next[trackId];
    return next;
  });
}

export async function getDownloadedTracksInfo(): Promise<
  Record<string, DownloadMeta>
> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_META_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as Record<string, DownloadMeta>;
    const valid: Record<string, DownloadMeta> = {};
    for (const [id, meta] of Object.entries(map)) {
      const file = getAudioFile(id);
      if (file.exists) {
        valid[id] = meta;
      }
    }
    return valid;
  } catch {
    return {};
  }
}
