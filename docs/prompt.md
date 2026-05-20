# LLM Prompt: Add Multi-Volume Support with Smart Inline Switching

## Context

I have a React Native devotional reading app called "Shifa Shareef" built with Expo Router. The app currently supports a single book (Volume 1) with 489 pages converted to WebP images. I need to add support for Volume 2 while **maintaining the core principle of one-tap resume**.

## Core Principle (CRITICAL)

**The app's main value is "Resume Instantly" - users should always be able to resume reading in ONE TAP.** Adding volume support must NOT break this principle. The solution must be elegant and unobtrusive.

## Current Architecture

**Tech Stack:**
- Expo Router (file-based routing)
- React Native + NativeWind
- AsyncStorage for persistence
- TypeScript

**Current Structure:**
```
app/
  (tabs)/
    index.tsx          // Home screen with "Continue Reading"
    sections.tsx       // Sections list
    journey.tsx        // Progress tracking
  reader/
    [page].tsx         // Page reader

data/
  book.ts              // Single book metadata (BOOK_TITLE, TOTAL_PAGES)
  sections.ts          // Sections for Volume 1
  pages.ts             // Page image mappings
  plans.ts             // Reading plans

hooks/
  useReadingProgress.ts    // Manages last page
  useBookmarks.ts          // Manages bookmarks
  useReadingPlan.ts        // Manages active plan
  useReadingSessions.ts    // Tracks sessions & streaks

assets/
  images/
    page-1.webp ... page-489.webp
```

**Current Data Types:**
```typescript
type Section = {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  estimatedMinutes: number;
  description: string;
};

type ReadingProgress = {
  lastPage: number;
  lastReadAt: string;
};

type Bookmark = {
  id: string;
  page: number;
  createdAt: string;
};

type ReadingPlan = {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  pagesPerDay: number;
};
```

## Required Solution: Smart Home with Inline Volume Switching

### **Design Approach**

**Home Screen Layout:**
```
┌─────────────────────────────────────┐
│  📚 Shifa Shareef                   │
│  ┌─────────┐ ┌─────────┐           │
│  │Volume 1 │ │Volume 2 │  ← Horizontal pills
│  └─────────┘ └─────────┘           │
│     Active      Inactive            │
├─────────────────────────────────────┤
│                                     │
│  Continue Reading                   │
│  Opening Chapters                   │ ← Current volume context
│  Page 42 of 489                     │
│  Last read: 2 hours ago             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Resume Reading          │   │ ← ONE TAP to reader
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  📊 Today's Progress                │
│  3 pages • 8 minutes                │ ← Current volume stats
├─────────────────────────────────────┤
│  📖 Reading Plan                    │
│  Day 5 of 180 • Daily Light         │ ← Current volume plan
└─────────────────────────────────────┘
```

### **Key Requirements**

1. **Volume selector pills at top of home screen**
   - Horizontal scrollable pills (Volume 1, Volume 2, etc.)
   - Current volume highlighted with `warmGold` background
   - Inactive volumes use `warmIvory` background
   - Tapping a pill switches the entire home context instantly

2. **Resume button always works in one tap**
   - Goes directly to reader for current volume
   - No intermediate screens or confirmations
   - Maintains the "instant resume" principle

3. **All home content is volume-aware**
   - Continue Reading card shows current volume's progress
   - Today's Progress shows current volume's stats
   - Reading Plan shows current volume's active plan
   - Quick actions operate on current volume

4. **Sections tab shows current volume's sections**
   - No volume selector needed here
   - Uses the volume selected on home screen

5. **Journey tab shows combined stats by default**
   - Total pages read across ALL volumes
   - Combined streak (reading any volume counts)
   - Optional volume filter at top to see per-volume stats
   - Bookmarks show volume indicator (e.g., "V1: Page 42")

6. **Reader routing includes volumeId**
   - Change from `/reader/[page]` to `/reader/[volumeId]/[page]`
   - Loads correct images based on volumeId

## Data Structure

```typescript
// Volume metadata
type Volume = {
  id: string;              // "volume1", "volume2"
  title: string;           // "Volume 1", "Volume 2"
  subtitle?: string;       // Optional subtitle
  totalPages: number;      // 489, 520, etc.
  sections: Section[];     // Volume-specific sections
  plans: ReadingPlan[];    // Volume-specific plans
};

// Per-volume progress
type VolumeProgress = {
  volumeId: string;
  lastPage: number;
  lastReadAt: string;
  completedPages: number[];
  bookmarks: Bookmark[];
  activePlanId?: string;
};

// Global app state
type AppState = {
  currentVolumeId: string;           // Currently selected volume
  volumes: Record<string, VolumeProgress>;  // Progress per volume
  globalStats: {
    totalPagesRead: number;          // Across all volumes
    streakCount: number;             // Global streak
    lastReadAt: string;              // Most recent read from any volume
    sessions: ReadingSession[];      // All sessions across volumes
  };
};

// Updated bookmark with volume reference
type Bookmark = {
  id: string;
  volumeId: string;      // NEW: which volume
  page: number;
  createdAt: string;
};

// Updated session with volume reference
type ReadingSession = {
  id: string;
  volumeId: string;      // NEW: which volume
  date: string;
  pagesRead: number;
  startPage: number;
  endPage: number;
  durationMinutes: number;
};
```

## File Organization

```
data/
  volumes.ts             // NEW: Volume metadata and registry
  volumes/
    volume1/
      sections.ts        // Volume 1 sections
      plans.ts           // Volume 1 plans
    volume2/
      sections.ts        // Volume 2 sections
      plans.ts           // Volume 2 plans

hooks/
  useCurrentVolume.ts    // NEW: Manages current volume selection
  useReadingProgress.ts  // UPDATED: Accept volumeId parameter
  useBookmarks.ts        // UPDATED: Accept volumeId parameter
  useReadingPlan.ts      // UPDATED: Accept volumeId parameter
  useReadingSessions.ts  // UPDATED: Track volumeId in sessions
  useGlobalStats.ts      // NEW: Aggregate stats across volumes

assets/
  images/
    volume1/
      page-1.webp ... page-489.webp
    volume2/
      page-1.webp ... page-XXX.webp
```

## Implementation Tasks

### **Phase 1: Data Structure & Volume Registry**

1. **Create `data/volumes.ts`:**
   ```typescript
   export const VOLUMES: Volume[] = [
     {
       id: "volume1",
       title: "Volume 1",
       totalPages: 489,
       sections: VOLUME1_SECTIONS,
       plans: VOLUME1_PLANS,
     },
     {
       id: "volume2",
       title: "Volume 2",
       totalPages: 520, // Update with actual count
       sections: VOLUME2_SECTIONS,
       plans: VOLUME2_PLANS,
     },
   ];
   
   export const getVolumeById = (id: string) => 
     VOLUMES.find(v => v.id === id);
   ```

2. **Create volume-specific data files:**
   - `data/volumes/volume1/sections.ts` (move existing sections)
   - `data/volumes/volume1/plans.ts` (move existing plans)
   - `data/volumes/volume2/sections.ts` (create new)
   - `data/volumes/volume2/plans.ts` (create new)

3. **Update page image mappings:**
   - `data/volumes/volume1/pages.ts`
   - `data/volumes/volume2/pages.ts`
   - Each should export `getPageImage(page: number)` function

### **Phase 2: Volume Selection Hook**

Create `hooks/useCurrentVolume.ts`:
```typescript
export const useCurrentVolume = () => {
  const [currentVolumeId, setCurrentVolumeId] = useState<string>("volume1");
  
  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem("currentVolumeId").then(id => {
      if (id) setCurrentVolumeId(id);
    });
  }, []);
  
  // Save to AsyncStorage when changed
  const switchVolume = async (volumeId: string) => {
    setCurrentVolumeId(volumeId);
    await AsyncStorage.setItem("currentVolumeId", volumeId);
  };
  
  const currentVolume = getVolumeById(currentVolumeId);
  
  return { currentVolumeId, currentVolume, switchVolume };
};
```

### **Phase 3: Refactor Existing Hooks**

**Update all hooks to be volume-aware:**

1. **`useReadingProgress(volumeId: string)`:**
   - Change AsyncStorage key from `reading-progress` to `reading-progress-${volumeId}`
   - Return progress for specific volume

2. **`useBookmarks(volumeId: string)`:**
   - Change AsyncStorage key from `bookmarks` to `bookmarks-${volumeId}`
   - Add volumeId to bookmark objects

3. **`useReadingPlan(volumeId: string)`:**
   - Change AsyncStorage key from `reading-plan` to `reading-plan-${volumeId}`
   - Return plan for specific volume

4. **`useReadingSessions()`:**
   - Keep global (tracks all volumes)
   - Add volumeId to session objects
   - Update streak calculation to count any volume read

### **Phase 4: Create Global Stats Hook**

Create `hooks/useGlobalStats.ts`:
```typescript
export const useGlobalStats = () => {
  const { sessions } = useReadingSessions();
  
  const totalPagesRead = useMemo(() => {
    return sessions.reduce((sum, s) => sum + s.pagesRead, 0);
  }, [sessions]);
  
  const volumeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    sessions.forEach(s => {
      stats[s.volumeId] = (stats[s.volumeId] || 0) + s.pagesRead;
    });
    return stats;
  }, [sessions]);
  
  return { totalPagesRead, volumeStats };
};
```

### **Phase 5: Update Home Screen**

Update `app/(tabs)/index.tsx`:

1. **Add volume selector pills at top:**
   ```tsx
   const { currentVolumeId, currentVolume, switchVolume } = useCurrentVolume();
   
   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
     {VOLUMES.map(volume => (
       <Pressable
         key={volume.id}
         onPress={() => switchVolume(volume.id)}
         style={{
           backgroundColor: currentVolumeId === volume.id 
             ? colors.secondary.warmGold 
             : colors.surface.warmIvory,
           // ... styling
         }}
       >
         <Text>{volume.title}</Text>
       </Pressable>
     ))}
   </ScrollView>
   ```

2. **Update Continue Reading card to use current volume:**
   ```tsx
   const { progress } = useReadingProgress(currentVolumeId);
   const currentSection = getCurrentSection(currentVolume, progress?.lastPage);
   
   <Pressable onPress={() => router.push(`/reader/${currentVolumeId}/${progress?.lastPage}`)}>
     <Text>Continue Reading</Text>
     <Text>{currentSection?.title}</Text>
     <Text>Page {progress?.lastPage} of {currentVolume.totalPages}</Text>
   </Pressable>
   ```

3. **Update all other cards to use currentVolumeId**

### **Phase 6: Update Reader Routing**

1. **Create new reader route:** `app/reader/[volumeId]/[page].tsx`
2. **Move existing reader logic** from `app/reader/[page].tsx`
3. **Update to load images based on volumeId:**
   ```tsx
   const { volumeId, page } = useLocalSearchParams();
   const volume = getVolumeById(volumeId);
   const pageImage = getPageImage(volumeId, page);
   ```

### **Phase 7: Update Sections Screen**

Update `app/(tabs)/sections.tsx`:
```tsx
const { currentVolumeId, currentVolume } = useCurrentVolume();
const { progress } = useReadingProgress(currentVolumeId);

// Display currentVolume.sections
// Navigate to `/reader/${currentVolumeId}/${section.startPage}`
```

### **Phase 8: Update Journey Screen**

Update `app/(tabs)/journey.tsx`:

1. **Show combined stats by default:**
   ```tsx
   const { totalPagesRead } = useGlobalStats();
   const { getCurrentStreak } = useReadingSessions();
   ```

2. **Add optional volume filter:**
   ```tsx
   const [filterVolume, setFilterVolume] = useState<string | null>(null);
   
   // Filter bookmarks and sessions by volume if filter is active
   ```

3. **Update bookmarks to show volume indicator:**
   ```tsx
   <Text>V{bookmark.volumeId === "volume1" ? "1" : "2"}: Page {bookmark.page}</Text>
   ```

### **Phase 9: Data Migration**

Create migration logic to convert existing Volume 1 data:

```typescript
const migrateToMultiVolume = async () => {
  // Check if migration needed
  const migrated = await AsyncStorage.getItem("migrated-to-multi-volume");
  if (migrated) return;
  
  // Migrate progress
  const oldProgress = await AsyncStorage.getItem("reading-progress");
  if (oldProgress) {
    await AsyncStorage.setItem("reading-progress-volume1", oldProgress);
  }
  
  // Migrate bookmarks
  const oldBookmarks = await AsyncStorage.getItem("bookmarks");
  if (oldBookmarks) {
    const bookmarks = JSON.parse(oldBookmarks);
    const updated = bookmarks.map(b => ({ ...b, volumeId: "volume1" }));
    await AsyncStorage.setItem("bookmarks-volume1", JSON.stringify(updated));
  }
  
  // Migrate plan
  const oldPlan = await AsyncStorage.getItem("reading-plan");
  if (oldPlan) {
    await AsyncStorage.setItem("reading-plan-volume1", oldPlan);
  }
  
  // Set current volume to volume1
  await AsyncStorage.setItem("currentVolumeId", "volume1");
  
  // Mark as migrated
  await AsyncStorage.setItem("migrated-to-multi-volume", "true");
};
```

Run this in `app/_layout.tsx` on app start.

## Design Guidelines

**Volume Selector Pills:**
- Use existing design system from `constants/theme.ts`
- Active: `backgroundColor: colors.secondary.warmGold`, `color: colors.primary.deepGreen`
- Inactive: `backgroundColor: colors.surface.warmIvory`, `color: colors.text.tertiary`
- Add `shadows.sm` for depth
- Horizontal scroll with 12px gap between pills
- 18px horizontal padding, 11px vertical padding
- Border radius: 20px

**Maintain Devotional Feel:**
- Keep transitions smooth and subtle
- No flashy animations
- Volume switching should feel natural, not technical
- Use warm, calm colors from existing palette

## User Flows

### **Flow 1: Resume Same Volume (Primary Use Case)**
1. Open app → Home shows Volume 1 (last active)
2. Tap "Resume Reading" → Reader opens at Volume 1, page 42
3. **Total taps: 1** ✅

### **Flow 2: Switch to Different Volume**
1. Open app → Home shows Volume 1
2. Tap "Volume 2" pill → Home updates to show Volume 2 context
3. Tap "Resume Reading" → Reader opens at Volume 2, page 15
4. **Total taps: 2** (only when switching)

### **Flow 3: Navigate Sections**
1. On Home, tap "Sections" tab
2. See sections for current volume (Volume 1)
3. Tap a section → Reader opens at that section's start page
4. **Works exactly like current app**

## Testing Checklist

- [ ] Volume switching updates all home content instantly
- [ ] Resume button always works in one tap
- [ ] Progress persists separately per volume
- [ ] Bookmarks are volume-specific
- [ ] Plans are volume-specific
- [ ] Journey shows combined stats correctly
- [ ] Streak counts reading from any volume
- [ ] Migration preserves existing Volume 1 data
- [ ] Reader loads correct images per volume
- [ ] Sections screen shows correct volume sections

## Constraints

- **MUST maintain one-tap resume** for primary use case
- Must not break any existing functionality
- Must preserve existing user data through migration
- Should be scalable to 3+ volumes in future
- Keep the devotional, calm UX
- Maintain performance (don't load all volumes at once)

## Expected Deliverables

1. Volume registry and metadata structure
2. Volume selection hook with persistence
3. Refactored hooks with volumeId support
4. Updated home screen with volume pills
5. Updated reader with volumeId routing
6. Updated sections and journey screens
7. Data migration logic
8. Global stats aggregation
9. Complete TypeScript types
10. Documentation of changes

---

**Please implement this multi-volume architecture step by step, prioritizing the one-tap resume principle above all else. Start with data structure, then hooks, then UI updates.**