const { Client, Databases, Query } = require("node-appwrite");
const fs = require("fs");
const path = require("path");

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || "69a53cb20013abbe9014";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "seerat";
const NAATS_COLLECTION_ID =
  process.env.APPWRITE_NAATS_COLLECTION_ID || "seerat";
const CHANNELS_COLLECTION_ID =
  process.env.APPWRITE_CHANNELS_COLLECTION_ID || "channels";

const SHIFA_KEYWORD = "Shifa Shareef";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const OUTPUT_DIR = path.join(__dirname, "..", "exports");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "shifa-audios-export.json");

function normalizeText(value) {
  return value?.trim?.() ?? "";
}

function toDurationSeconds(doc) {
  if (typeof doc.cutDuration === "number" && doc.cutDuration > 0)
    return doc.cutDuration;
  if (typeof doc.duration === "number" && doc.duration > 0) return doc.duration;
  return null;
}

function getAudioFileId(doc) {
  const cutAudio = normalizeText(doc.cutAudio);
  if (cutAudio) return cutAudio;
  return normalizeText(doc.audioId);
}

function toAudioTrack(doc) {
  const audioFileId = getAudioFileId(doc);
  if (!audioFileId) return null;

  return {
    id: doc.$id,
    title: normalizeText(doc.title) || "Untitled dars",
    audioFileId,
    durationSeconds: toDurationSeconds(doc),
    uploadedAt: normalizeText(doc.uploadDate) || null,
    youtubeId: normalizeText(doc.youtubeId) || null,
    channelName: normalizeText(doc.channelName) || null,
    sortOrder: doc.sortOrder ?? null,
  };
}

function dedupeTracks(tracks) {
  const seen = new Set();
  return tracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

async function getShifaChannelId() {
  console.log("  Fetching channels...");
  const response = await databases.listDocuments(
    DATABASE_ID,
    CHANNELS_COLLECTION_ID,
    [Query.limit(50), Query.orderAsc("modeOrder")]
  );

  const match = response.documents.find((ch) => {
    const modeName = normalizeText(ch.modeName).toLowerCase();
    const channelName = normalizeText(ch.channelName).toLowerCase();
    return modeName.includes("shifa") || channelName.includes("shifa");
  });

  if (!match) return null;
  return normalizeText(match.channelId) || match.$id;
}

async function fetchShifaAudioTracks(limit = 200) {
  console.log("  Looking up Shifa Shareef channel...");
  const shifaChannelId = await getShifaChannelId();
  const baseQueries = [Query.limit(limit), Query.orderDesc("uploadDate")];

  if (shifaChannelId) {
    baseQueries.push(Query.equal("channelId", shifaChannelId));
  }

  console.log("  Fetching naats...");
  let response;
  try {
    response = await databases.listDocuments(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      baseQueries
    );
  } catch (err) {
    console.error("  Primary query failed:", err.message);
    if (shifaChannelId) return [];
    throw err;
  }

  const tracks = response.documents
    .map(toAudioTrack)
    .filter(Boolean);

  if (tracks.length > 0) return dedupeTracks(tracks);

  if (!shifaChannelId) {
    console.log("  No channel match, trying fallback search...");
    const fallback = await databases.listDocuments(
      DATABASE_ID,
      NAATS_COLLECTION_ID,
      [
        Query.limit(limit),
        Query.orderDesc("uploadDate"),
        Query.search("title", "shifa"),
      ]
    );
    return dedupeTracks(
      fallback.documents.map(toAudioTrack).filter(Boolean)
    );
  }

  return [];
}

async function generateExport() {
  console.log("=== Shifa Shareef Audio Export ===\n");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching audio tracks from Appwrite...\n");

  let tracks;
  try {
    tracks = await fetchShifaAudioTracks(200);
  } catch (err) {
    console.error("\nExport failed:", err.message);
    process.exit(1);
  }

  tracks.sort(
    (a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity)
  );

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalItems: tracks.length,
      version: "1.0",
      source: "Appwrite Database",
      note: "Static fallback export. Data may be outdated.",
    },
    data: tracks,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2));

  const bytes = fs.statSync(OUTPUT_FILE).size;
  console.log(`\nWrote ${tracks.length} tracks to:`);
  console.log(`  ${OUTPUT_FILE}`);
  console.log(`  Size: ${(bytes / 1024).toFixed(1)} KB\n`);
  console.log("Done!");
}

generateExport();
