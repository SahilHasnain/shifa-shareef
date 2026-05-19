# Shifa Shareef - Native Packages Reference

This document lists all native packages installed for V1 features. These are configured and ready for the native build.

## Core Native Packages

### PDF & File Handling
- **react-native-pdf** `^7.0.4` - Native PDF rendering (PDFKit on iOS, PdfRenderer on Android)
- **react-native-blob-util** `^0.24.8` - File system access for PDF loading
- **@config-plugins/react-native-pdf** `^12.0.0` - Expo config plugin
- **@config-plugins/react-native-blob-util** `^12.0.0` - Expo config plugin

### Storage & Persistence
- **@react-native-async-storage/async-storage** `^2.2.0` - Async key-value storage
- **react-native-mmkv** `latest` - Fast synchronous storage (for reading progress, bookmarks)

### Navigation & UI
- **expo-router** `~6.0.23` - File-based routing
- **react-native-safe-area-context** `~5.6.0` - Safe area handling
- **react-native-gesture-handler** `~2.28.0` - Touch gestures
- **react-native-screens** `~4.16.0` - Native screen optimization
- **react-native-reanimated** `~4.1.1` - Smooth animations

### Reading Experience Features
- **expo-screen-orientation** `latest` - Lock orientation in Focus Mode
- **expo-brightness** `latest` - Brightness control for reading modes
- **expo-haptics** `~15.0.8` - Haptic feedback for interactions

### Future Features (Pre-installed)
- **expo-av** `latest` - Audio playback for synced recitation
- **expo-sharing** `latest` - Share quotes/passages
- **expo-notifications** `latest` - Reading reminders and streaks
- **expo-file-system** `latest` - File operations for exports

### Expo Core
- **expo** `~54.0.34` - Expo SDK
- **expo-asset** `~12.0.13` - Asset bundling (for PDF)
- **expo-constants** `~18.0.12` - App constants
- **expo-font** `~14.0.10` - Custom fonts
- **expo-splash-screen** `~31.0.13` - Splash screen
- **expo-status-bar** `~3.0.9` - Status bar control
- **expo-system-ui** `~6.0.9` - System UI control

## Feature Mapping

### V1 Features → Packages

| Feature | Required Packages |
|---------|------------------|
| PDF Reading | `react-native-pdf`, `react-native-blob-util` |
| Resume Reading | `@react-native-async-storage/async-storage`, `react-native-mmkv` |
| Bookmarks | `react-native-mmkv` |
| Reading Progress | `react-native-mmkv` |
| Reading Plans | `react-native-mmkv` |
| Focus Mode | `expo-screen-orientation` |
| Brightness Control | `expo-brightness` |
| Sepia/Night Mode | Built-in (no package needed) |
| Page Navigation | `react-native-pdf` (built-in) |
| Haptic Feedback | `expo-haptics` |
| Audio Recitation (V2) | `expo-av` ✅ Pre-installed |
| Share Quotes (V2) | `expo-sharing` ✅ Pre-installed |
| Reading Reminders (V2) | `expo-notifications` ✅ Pre-installed |
| Export Features (V2) | `expo-file-system` ✅ Pre-installed |

## Future V2 Features (Not Yet Installed)

These will require native rebuilds when added:

- **Cloud Sync** - Will need `@react-native-firebase/firestore` or similar
- **In-App Purchases** - Will need `expo-in-app-purchases` (if monetizing)

## Build Commands

After any native package changes, rebuild:

```bash
# Development build
npx expo prebuild --clean
npx expo run:android
npx expo run:ios

# Production build
eas build --platform android
eas build --platform ios
```

## Notes

- All packages are compatible with Expo SDK 54
- MMKV is preferred over AsyncStorage for reading progress (faster, synchronous)
- Config plugins are properly configured in `app.json`
- No additional native code modifications needed
