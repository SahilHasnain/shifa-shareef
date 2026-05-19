# Shifa Shareef - Islamic Devotional Reading App

A beautifully focused reading companion built specifically for Shifa Shareef, designed to make devotional reading effortless and consistent.

## 🎯 Product Vision

This is not a generic PDF reader. It's a calm, guided reading companion that:
- Makes it effortless to resume reading
- Reduces the psychological weight of a long text
- Makes progress visible and encouraging
- Creates a respectful, peaceful atmosphere

## ✨ Key Features

### V1 (Current)
- 📖 **Native PDF Reading** - Smooth, high-performance PDF rendering
- 🔖 **Smart Bookmarks** - Save and return to important passages
- 📊 **Progress Tracking** - Visual progress with reading streaks
- 📑 **Section Navigation** - Navigate by meaningful sections, not just pages
- 📅 **Reading Plans** - 7-day, 21-day, and daily light plans
- 🌙 **Reading Modes** - Sepia, Night, and Light modes with brightness control
- 🎯 **Focus Mode** - Distraction-free reading with orientation lock
- ⚡ **Instant Resume** - One-tap continue from where you left off

### V2 (Planned)
- 🔊 Audio recitation sync
- 🌐 Cloud backup for progress
- 📤 Share quotes and passages
- 🔔 Reading reminders
- 🌙 Ramadan special plans

## 🏗️ Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **PDF Rendering**: react-native-pdf (native PDFKit/PdfRenderer)
- **Storage**: MMKV (fast synchronous storage)
- **State**: React hooks + AsyncStorage
- **TypeScript**: Full type safety

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🚀 Building

### Development Build
```bash
npm run build:dev           # Android
npm run build:dev:ios       # iOS
```

### Production Build
```bash
npm run build:prod          # Android
npm run build:prod:ios      # iOS
npm run build:all           # Both platforms
```

See [BUILD.md](./docs/BUILD.md) for detailed build instructions.

## 📱 App Variants

The app supports multiple build variants for parallel installation:

| Variant | Package ID | Use Case |
|---------|-----------|----------|
| Production | `com.shifashareef` | Store release |
| Preview | `com.shifashareef.preview` | Beta testing |
| Development | `com.shifashareef.dev` | Local development |

## 📚 Documentation

- [Product Idea & Vision](./docs/idea.md) - Complete product specification
- [Build Guide](./docs/BUILD.md) - Build and deployment instructions
- [Packages Reference](./docs/PACKAGES.md) - All native packages and their purposes

## 🎨 Design Principles

- **Peaceful & Reverent** - Calm color palette with warm ivory and deep green
- **Focused** - Minimal distractions, clean interfaces
- **Encouraging** - Gentle progress feedback without gamification
- **Accessible** - Clear typography, good contrast, readable fonts

## 🗂️ Project Structure

```
shifa-shareef/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home screen
│   │   ├── sections.tsx   # Sections list
│   │   └── journey.tsx    # Progress & stats
│   └── reader/
│       └── [page].tsx     # PDF reader
├── assets/                # Images, fonts, PDF
│   └── pdf/
│       └── Shifa Shareef Urdu - V1.pdf
├── components/            # Reusable components
├── data/                  # Static data (sections, plans)
├── hooks/                 # Custom React hooks
├── docs/                  # Documentation
└── app.config.js         # Expo configuration
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Environment Setup
```bash
# Install Expo CLI globally
npm install -g expo-cli

# Install EAS CLI for builds
npm install -g eas-cli

# Login to Expo
eas login
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## 📄 License

Private - All rights reserved

## 👥 Team

Built with ❤️ for the Muslim community

---

**Note**: This is a devotional reading app focused on providing a peaceful, distraction-free experience for reading Shifa Shareef.
