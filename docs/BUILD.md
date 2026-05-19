# Shifa Shareef - Build Guide

## Package Identifiers by Variant

The app uses different package identifiers for each build variant to allow multiple versions to be installed simultaneously:

| Variant | Package ID | App Name | Use Case |
|---------|-----------|----------|----------|
| **Production** | `com.shifashareef` | Shifa Shareef | Play Store / App Store release |
| **Preview** | `com.shifashareef.preview` | Shifa Shareef (Preview) | Internal testing / Beta |
| **Development** | `com.shifashareef.dev` | Shifa Shareef (Dev) | Local development |

## Build Commands

### Local Development Build

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Android (requires Android Studio)
npm run android

# Run on iOS (requires Xcode, macOS only)
npm run ios
```

### EAS Cloud Builds

#### Development Build (Internal Testing)
```bash
# Android APK
eas build --profile development --platform android

# iOS Development
eas build --profile development --platform ios
```

#### Preview Build (Beta Testing)
```bash
# Android APK
eas build --profile preview --platform android

# iOS TestFlight
eas build --profile preview --platform ios
```

#### Production Build (Store Release)
```bash
# Android AAB for Play Store
eas build --profile production --platform android

# iOS for App Store
eas build --profile production --platform ios
```

### Build Both Platforms
```bash
eas build --profile production --platform all
```

## Environment Variables

Set these in your build profile or locally:

- `APP_VARIANT` - Controls which package ID and app name to use
  - `development` - Dev variant
  - `preview` - Preview variant
  - `production` - Production variant (default)

## Version Management

### Android
- Version code auto-increments on production builds
- Manually update in `app.config.js` if needed

### iOS
- Version auto-increments on production builds
- Manually update in `app.config.js` if needed

## Pre-Build Checklist

Before building for production:

- [ ] Update version in `app.config.js`
- [ ] Test on both Android and iOS
- [ ] Verify all native packages work
- [ ] Check PDF loading and rendering
- [ ] Test reading progress persistence
- [ ] Verify bookmarks functionality
- [ ] Test all reading modes (sepia, night, light)
- [ ] Check brightness and orientation controls
- [ ] Test on different screen sizes
- [ ] Verify app icons and splash screen
- [ ] Test deep linking (if implemented)

## Troubleshooting

### Native Module Errors

If you get "Native module is null" errors:

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo prebuild --clean
```

### Build Failures

```bash
# Clear EAS build cache
eas build:clear-cache

# Rebuild
eas build --profile production --platform android --clear-cache
```

### Local Build Issues

```bash
# Android
cd android
./gradlew clean
cd ..
npx expo run:android

# iOS
cd ios
pod install
cd ..
npx expo run:ios
```

## Submission

### Google Play Store

```bash
eas submit --platform android --latest
```

### Apple App Store

```bash
eas submit --platform ios --latest
```

## CI/CD Integration

The project is ready for CI/CD with GitHub Actions or similar. Example workflow:

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: eas build --profile production --platform all --non-interactive
```

## Notes

- All native packages are pre-installed for V1 and V2 features
- No rebuild needed when adding V2 features (audio, sharing, notifications)
- Only cloud sync or IAP will require future rebuilds
- MMKV is used for fast local storage
- PDF rendering uses native engines (PDFKit on iOS, PdfRenderer on Android)
