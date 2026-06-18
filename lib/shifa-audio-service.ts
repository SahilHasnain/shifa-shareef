import { Client, Databases, Query } from "appwrite";

const FALLBACK_AUDIO_CONFIG = {
  endpoint: "https://sgp.cloud.appwrite.io/v1",
  projectId: "69a53cb20013abbe9014",
  databaseId: "seerat",
  naatsCollectionId: "seerat",
  channelsCollectionId: "channels",
  audioBucketId: "audio-files",
  shifaKeyword: "Shifa Shareef",
} as const;

const appwriteAudioConfig = {
  endpoint:
    process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? FALLBACK_AUDIO_CONFIG.endpoint,
  projectId:
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ??
    FALLBACK_AUDIO_CONFIG.projectId,
  databaseId:
    process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ??
    FALLBACK_AUDIO_CONFIG.databaseId,
  naatsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_NAATS_COLLECTION_ID ??
    FALLBACK_AUDIO_CONFIG.naatsCollectionId,
  channelsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID ??
    FALLBACK_AUDIO_CONFIG.channelsCollectionId,
  audioBucketId:
    process.env.EXPO_PUBLIC_APPWRITE_AUDIO_BUCKET_ID ??
    FALLBACK_AUDIO_CONFIG.audioBucketId,
  shifaKeyword:
    process.env.EXPO_PUBLIC_APPWRITE_SHIFA_CHANNEL_KEYWORD ??
    FALLBACK_AUDIO_CONFIG.shifaKeyword,
} as const;

const appwriteClient = new Client()
  .setEndpoint(appwriteAudioConfig.endpoint)
  .setProject(appwriteAudioConfig.projectId);

const appwriteDatabase = new Databases(appwriteClient);

type AppwriteChannelDocument = {
  $id: string;
  channelId?: string;
  channelName?: string;
  modeName?: string;
};

type AppwriteAudioDocument = {
  $id: string;
  title?: string;
  audioId?: string | null;
  cutAudio?: string | null;
  duration?: number | null;
  cutDuration?: number | null;
  uploadDate?: string;
  youtubeId?: string;
  channelName?: string;
  sortOrder?: number | null;
};

export type ShifaAudioTrack = {
  id: string;
  title: string;
  audioFileId: string;
  durationSeconds: number | null;
  uploadedAt: string | null;
  youtubeId: string | null;
  channelName: string | null;
  sortOrder: number | null;
};

function normalizeText(value?: string | null): string {
  return value?.trim() ?? "";
}

function toDurationSeconds(document: AppwriteAudioDocument): number | null {
  if (typeof document.cutDuration === "number" && document.cutDuration > 0) {
    return document.cutDuration;
  }

  if (typeof document.duration === "number" && document.duration > 0) {
    return document.duration;
  }

  return null;
}

function getAudioFileId(document: AppwriteAudioDocument): string {
  const cutAudio = normalizeText(document.cutAudio);
  if (cutAudio.length > 0) {
    return cutAudio;
  }

  return normalizeText(document.audioId);
}

function toAudioTrack(document: AppwriteAudioDocument): ShifaAudioTrack | null {
  const audioFileId = getAudioFileId(document);
  if (!audioFileId) {
    return null;
  }

  const title = normalizeText(document.title) || "Untitled dars";

  return {
    id: document.$id,
    title,
    audioFileId,
    durationSeconds: toDurationSeconds(document),
    uploadedAt: normalizeText(document.uploadDate) || null,
    youtubeId: normalizeText(document.youtubeId) || null,
    channelName: normalizeText(document.channelName) || null,
    sortOrder: document.sortOrder ?? null,
  };
}

function dedupeTracks(tracks: ShifaAudioTrack[]): ShifaAudioTrack[] {
  const seenTrackIds = new Set<string>();
  const result: ShifaAudioTrack[] = [];

  tracks.forEach((track) => {
    if (seenTrackIds.has(track.id)) {
      return;
    }

    seenTrackIds.add(track.id);
    result.push(track);
  });

  return result;
}

async function getShifaChannelId(): Promise<string | null> {
  const response = await appwriteDatabase.listDocuments(
    appwriteAudioConfig.databaseId,
    appwriteAudioConfig.channelsCollectionId,
    [Query.limit(50), Query.orderAsc("modeOrder")],
  );

  const channelDocuments = response.documents as unknown as AppwriteChannelDocument[];
  const shifaKeyword = appwriteAudioConfig.shifaKeyword.toLowerCase();

  const channelMatch = channelDocuments.find((channel) => {
    const modeName = normalizeText(channel.modeName).toLowerCase();
    const channelName = normalizeText(channel.channelName).toLowerCase();

    return modeName.includes(shifaKeyword) || channelName.includes("shifa");
  });

  if (!channelMatch) {
    return null;
  }

  return normalizeText(channelMatch.channelId) || channelMatch.$id;
}

export async function fetchShifaAudioTracks(
  limit: number = 120,
): Promise<ShifaAudioTrack[]> {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const shifaChannelId = await getShifaChannelId();
  const baseQueries = [Query.limit(safeLimit), Query.orderDesc("uploadDate")];

  if (shifaChannelId) {
    baseQueries.push(Query.equal("channelId", shifaChannelId));
  }

  const response = await appwriteDatabase.listDocuments(
    appwriteAudioConfig.databaseId,
    appwriteAudioConfig.naatsCollectionId,
    baseQueries,
  );

  const mappedTracks = (response.documents as unknown as AppwriteAudioDocument[])
    .map(toAudioTrack)
    .filter((track): track is ShifaAudioTrack => Boolean(track));

  const sorted = (tracks: ShifaAudioTrack[]) =>
    tracks.sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));

  if (mappedTracks.length > 0) {
    return sorted(dedupeTracks(mappedTracks));
  }

  if (shifaChannelId) {
    return [];
  }

  const fallbackSearchResponse = await appwriteDatabase.listDocuments(
    appwriteAudioConfig.databaseId,
    appwriteAudioConfig.naatsCollectionId,
    [
      Query.limit(safeLimit),
      Query.orderDesc("uploadDate"),
      Query.search("title", "shifa"),
    ],
  );

  const fallbackTracks = (
    fallbackSearchResponse.documents as unknown as AppwriteAudioDocument[]
  )
    .map(toAudioTrack)
    .filter((track): track is ShifaAudioTrack => Boolean(track));

  return sorted(dedupeTracks(fallbackTracks));
}

export function getShifaAudioFileUrl(audioFileId: string): string {
  const encodedFileId = encodeURIComponent(audioFileId);
  const encodedProjectId = encodeURIComponent(appwriteAudioConfig.projectId);

  return `${appwriteAudioConfig.endpoint}/storage/buckets/${appwriteAudioConfig.audioBucketId}/files/${encodedFileId}/view?project=${encodedProjectId}`;
}
