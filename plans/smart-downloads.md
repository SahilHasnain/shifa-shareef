# Smart Downloads Plan

Date: 2026-08-09

## Goal

Make the whole-book experience offline friendly without heavy bundles:

1. Detect the language the user actually prefers reading in.
2. Silently auto-download that language's content (all its volumes) on mobile data too.
3. Give the user an explicit `Download` / `Remove` control in Settings.

## Decisions (locked)

- **Auto-download scope**: ALL volumes of the preferred language (Urdu = volume1 + volume2). Content is small, so this is cheap and gives a fully offline preferred language.
- **Preferred threshold**: a language becomes "preferred" when it has `>= 2` reading sessions OR `>= 2` distinct read days. Exploring a language briefly (1 session) does not trigger a download.
- **No SQLite.** Content stays as HTML chapter files (manifest + css + chapters) served from the CDN and cached to the existing disk store (`reader-content-cache`). One source of truth, one cache.
- **No Wi-Fi gate.** Mobile data is fine.

## Architecture

```
useReadingSessions ──> resolvePreferredLanguage() ──> useAutoDownload (root layout)
                                                              │
useVolumeDownloadState <── volume-download-service ───────────┘
          (partial/complete)      │ downloads manifest, css, chapters, epub
                                  v
                     reader-content-cache (shared disk store)
```

- Reader and downloader share the same on-disk cache: if a volume is "Downloaded", the reader works fully offline channel.
- The `.epub` fallback file is pre-fetched to the exact location `EpubReader` looks for, so the EPUB path also works offline.

## Files

### New

- `lib/volume-download-service.ts`
  - `getVolumeDownloadState(lang, vol)` -> `none | partial | complete | unknown`
  - `downloadVolume(lang, vol, onProgress?)` (concurrent batches, cancellable via token)
  - `removeVolumeDownload(lang, vol)`
  - AsyncStorage meta `shifa-shareef:volume-downloads`
- `lib/preferred-language.ts`
  - `resolvePreferredLanguage(sessions)` -> `{ languageId, totalPages, sessionCount, distinctDays } | null`
- `hooks/useAutoDownload.ts`
  - resolves preferred language after sessions load; downloads missing volumes; idempotent per app-run

### Edit

- `lib/reader-content-cache.ts` — expose `hasCachedChapter` + `getCachedChapterFileCount`
- `app/_layout.tsx` — mount `useAutoDownload`
- `app/(tabs)/settings.tsx` — "Downloads" card (per-language/volume status + `Download`/`Remove` + progress)

## Behavior

- Fresh install, nothing read: nothing downloaded (no preference yet).
- User reads in a language (>=2 sessions / days): that language's volumes are downloaded in the background on next sessions change; `Downloaded`, `Downloading x%`, `Partial` states reflect in Settings.
- User switches to a new language to explore: no auto-download until they actually read in it enough.
- Explicit Settings `Download` works anytime and is the source of truth UI (incl. remove).

## Acceptance

- `npm run typecheck` and `npm run lint` pass.
- Settings shows correct states and download/remove work.
- A fully "Downloaded" volume opens in the reader with no network.