# EPUB Reader Implementation

Phase 1 implementation of EPUB support for Shifa Shareef.

## What's Implemented

### 1. Data Model Updates

**Updated Types:**
- `Volume` type now includes `format: "image" | "epub"`
- `VolumeAssetManifest` includes optional `epubUrl?: string`
- `VolumeProgress` supports both page-based and CFI-based progress:
  - `lastCfi?: string` - EPUB location identifier
  - `progressPercent?: number` - Reading progress percentage

**Existing Volumes:**
- All current volumes marked as `format: "image"`
- No breaking changes to existing data

### 2. EPUB Reader Component

**Location:** `components/readers/EpubReader.tsx`

**Features:**
- WebView-based rendering using epub.js CDN
- Navigation: Next/Previous page buttons
- Progress tracking: CFI + percentage display
- Theme support: Colors from app theme
- Error handling for failed loads

**Communication Protocol:**
- Uses `postMessage` for React Native ↔ WebView communication
- RN → WebView: `LOAD_EPUB`, `NEXT_PAGE`, `PREV_PAGE`, `GO_TO_CFI`, `SET_THEME`
- WebView → RN: `READY`, `LOCATION_CHANGED`, `ERROR`

### 3. Progress Tracking

**New Hook:** `hooks/useEpubProgress.ts`

Manages EPUB-specific progress:
- Stores CFI (Canonical Fragment Identifier)
- Tracks progress percentage (0-1)
- Persists to AsyncStorage per language/volume

### 4. Reader Routing

**Updated:** `app/reader/[languageId]/[volumeId]/[page].tsx`

Smart routing based on volume format:
- Detects `volume.format`
- Renders `EpubReader` for EPUB volumes
- Renders existing image reader for image volumes

## How to Use

### Add an EPUB Volume

1. Update volume definition in `data/language-registry.ts`:

```typescript
{
  id: "volume1",
  title: "Volume 1",
  totalPages: 300, // approximate for progress calculation
  sections: SECTIONS,
  plans: PLANS,
  format: "epub", // <-- Set format
}
```

2. Upload EPUB to assets repo:
```
https://cdn.jsdelivr.net/gh/SahilHasnain/shifa-shareef-assets@main/epub/{languageId}/{volumeId}.epub
```

3. Update the `epubUrl` in the reader screen (or make it dynamic from manifest)

### Test EPUB Reader

Navigate to any volume with `format: "epub"` and the EPUB reader will automatically load.

## Current Limitations (Phase 1)

- No bookmark UI (progress auto-saves)
- No search functionality
- No font size controls
- No text selection/highlighting
- No download management (loads directly from CDN)
- EPUB URL is hardcoded (needs manifest integration)

## Next Steps (Phase 2)

- [ ] Integrate EPUB URL from asset manifests
- [ ] Download management for offline reading
- [ ] Bookmarks UI for EPUB
- [ ] Font size adjustment controls
- [ ] Search within EPUB
- [ ] Text selection and highlighting
- [ ] Update Journey/Sections screens for EPUB volumes
- [ ] Session tracking for EPUB reading

## Technical Details

### epub.js Integration

Using CDN version `0.3.93` loaded via WebView HTML:
```html
<script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
```

### Progress Format

**Image volumes:**
```json
{
  "lastPage": 42,
  "lastReadAt": "2024-01-15T10:30:00Z"
}
```

**EPUB volumes:**
```json
{
  "lastCfi": "epubcfi(/6/14[chapter03]!/4/2/16,/1:125,/1:126)",
  "progressPercent": 0.42,
  "lastReadAt": "2024-01-15T10:30:00Z"
}
```

## Files Changed

- `data/types.ts` - Added format fields
- `data/language-registry.ts` - Added format to volumes
- `components/readers/EpubReader.tsx` - New EPUB reader
- `hooks/useEpubProgress.ts` - New progress hook
- `app/reader/[languageId]/[volumeId]/[page].tsx` - Format detection routing
- `package.json` - Added react-native-webview

## Package Dependencies

- `react-native-webview` - WebView for epub.js renderer
- epub.js (CDN) - EPUB rendering engine
