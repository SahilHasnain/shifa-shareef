# Remote Asset Delivery Spec

## Goal

Move page images out of the app bundle and deliver them remotely through a CDN, while keeping reading fast, offline-friendly, and language-aware.

This should solve:

- oversized app builds from bundled page images
- difficulty adding new languages
- need to ship app updates for content-only changes

## Product Decision

Use a `CDN + local cache` model.

Do not treat `raw.githubusercontent.com` as the final production delivery layer. If GitHub remains the content origin, prefer:

- `jsDelivr` for GitHub-backed CDN delivery
- or GitHub Releases for large static asset packages

## Core Principles

- app code stays bundled
- page images are remote-first
- downloaded pages are cached locally for offline reading
- language and volume remain first-class content scopes
- users can download only what they need
- reading should not stall when moving page to page

## Content Model

The app should resolve assets by:

- `languageId`
- `volumeId`
- `page`

Canonical remote path shape:

```text
cdn/<languageId>/<volumeId>/page-001.webp
cdn/<languageId>/<volumeId>/page-002.webp
```

Canonical local cache shape:

```text
cache/pages/<languageId>/<volumeId>/page-001.webp
cache/pages/<languageId>/<volumeId>/page-002.webp
```

## Manifest

Each language should have a manifest, either per language or per volume.

Recommended shape:

```json
{
  "version": "2026-05-21-1",
  "languageId": "roman-urdu",
  "title": "Roman Urdu",
  "volumes": [
    {
      "id": "volume1",
      "title": "Volume 1",
      "totalPages": 306,
      "baseUrl": "https://cdn.example.com/roman-urdu/volume1/",
      "filePattern": "page-{page}.webp",
      "hashes": {
        "1": "sha256-or-etag",
        "2": "sha256-or-etag"
      }
    }
  ]
}
```

Minimum required fields:

- `version`
- `languageId`
- `volumes`
- `totalPages`
- `baseUrl`
- `filePattern`

Useful optional fields:

- `hashes`
- `coverImage`
- `samplePages`
- `updatedAt`

## App Layers

### 1. Language Registry

The current registry remains the source of:

- language titles
- volume metadata
- sections
- plans

But page-image loading should stop depending on bundled `require(...)` assets and instead use a resolver.

### 2. Asset Resolver

Create one resolver responsible for:

- checking whether a page exists locally
- returning local URI if cached
- otherwise returning remote URI or triggering a download

Proposed API:

```ts
getPageSource(languageId, volumeId, page): Promise<{
  kind: "local" | "remote" | "missing";
  uri?: string;
}>
```

### 3. Download Manager

The app needs a download manager responsible for:

- downloading a single page
- downloading a page range
- downloading a full volume
- tracking progress
- retrying failed assets
- cancelling downloads

Recommended capabilities:

- `downloadPage(languageId, volumeId, page)`
- `downloadVolume(languageId, volumeId)`
- `prefetchAroundPage(languageId, volumeId, page)`
- `getDownloadStatus(languageId, volumeId)`

### 4. Cache Index

Track local availability in app storage.

Recommended stored data:

- manifest version per language
- downloaded pages per volume
- volume download progress
- last validation timestamp
- failed pages list

## Reading Behavior

### Default

When opening a page:

1. check local cache
2. if page exists locally, render immediately
3. if not, fetch from CDN and cache it
4. prefetch nearby pages after render

### Prefetch Window

Recommended initial prefetch:

- current page
- next 2 pages
- previous 1 page

Later optimization:

- increase prefetch when on Wi-Fi
- reduce prefetch on low storage or weak network

### Offline Behavior

If a page is not cached and the device is offline:

- do not fail silently
- show a clear unavailable state
- offer `Retry`
- show whether the rest of the volume is downloaded

## Download UX

### Home / Language Switcher

Each language should show:

- `Available online`
- `Partially downloaded`
- `Downloaded`

### Volume Actions

Each volume can expose:

- `Read now`
- `Download volume`
- `Remove download`

### Reader

Inside the reader:

- current page should load immediately if cached
- show subtle loading for remote-first pages
- avoid full-screen blocking spinners during normal page turns

## Hybrid Launch Strategy

Recommended rollout:

### Phase A

Keep one default language bundled.

Use remote delivery for:

- Roman Urdu
- any newly added language

This reduces risk while proving the remote system.

### Phase B

Move all non-core languages to CDN.

### Phase C

Optionally move even the default language remote, with a very small starter bundle or no bundled pages at all.

## Versioning Strategy

Every manifest must have a version string.

When the manifest version changes:

- compare local stored version
- invalidate stale cache only where needed
- keep unchanged pages if hashes still match

Do not blindly clear the full cache on every update.

## CDN Strategy

Preferred order:

1. dedicated static CDN
2. jsDelivr on top of GitHub
3. GitHub Releases assets

Avoid building the product around direct `raw.githubusercontent.com` URLs.

## Error Handling

The system must handle:

- slow network
- missing page file
- corrupted local cache
- partial volume download
- manifest mismatch
- cancelled download

Reader failures should degrade gracefully into a retryable state, not a crash.

## Security / Integrity

At minimum:

- validate manifest structure
- validate that requested pages stay inside known language/volume/page bounds

Nice to have:

- hash validation for downloaded files

## Storage Policy

Support:

- cache size estimation
- remove one language
- remove one volume
- remove all cached content

Users should be able to manage storage from settings later.

## Repo Changes Required

### New

- manifest format and generator
- remote asset resolver
- local cache service
- download manager
- download status persistence

### Refactor

- replace bundled page `require(...)` lookup as the primary read path
- keep current language and volume metadata
- adapt reader to accept resolved `uri` sources

## Recommended Go Plan

### Go 1

Foundation:

- manifest schema
- resolver interface
- cache directory structure
- local/remote source abstraction

### Go 2

Reader integration:

- page source resolution
- local cache lookup
- remote fetch fallback
- prefetch around current page

### Go 3

Downloads and UX:

- download volume
- download status UI
- offline unavailable states
- remove downloaded content

### Go 4

Migration and hardening:

- move one non-default language fully remote
- test cache invalidation
- test first-launch online and offline flows
- optimize storage and retry behavior

## Decision

This is the best long-term direction for the app, but only if implemented as a proper content-delivery system.

The target architecture is:

- bundled app shell
- remote language assets
- local offline cache
- per-language and per-volume download control
