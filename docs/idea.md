# Shifa Shareef App Idea

## Product Direction

This should not feel like a generic PDF reader with an Islamic cover image.
It should feel like a calm guided reading companion built specifically for `Shifa Shareef`.

The main product goal is simple:

- make it effortless to resume reading
- reduce the psychological weight of a long text
- make progress visible
- create a respectful atmosphere that encourages consistency

The right framing is:

`PDF-based devotional reading app`, not `document viewer`

---

## Core Experience

The PDF remains the main source of truth for the book, but the app adds a smart layer around it:

- `Continue Reading` as the default action
- meaningful sectioning over page numbers
- bookmarks and notes tied to pages
- reading plans with small daily goals
- soft progress feedback after each session
- a distraction-free reading mode

Users should feel this every time they open the app:

1. I know where I stopped.
2. I can start in one tap.
3. I only need to read a small amount right now.
4. I am steadily moving forward.

---

## Target User Feeling

The app should create these impressions:

- peaceful
- reverent
- lightweight
- focused
- encouraging without being noisy

Avoid:

- flashy gamification
- social feed patterns
- loud gradients inside the reader
- too many controls always visible
- making the app feel academic or technical

---

## Information Architecture

The best structure is 4 main tabs.

### 1. Home

Purpose: give the user one clear next action.

Key modules:

- `Continue Reading` card
- today’s reading target
- current reading plan progress
- intention / reflection card
- quick actions: `Read 5 min`, `Open Sections`, `Bookmarks`

What matters:

- this screen should reduce decision fatigue
- primary CTA should always be `Resume`
- show progress in pages and sections, not only percentages

### 2. Read

Purpose: the cleanest possible PDF reading experience.

Key modules:

- PDF viewer
- tap to show/hide controls
- page slider / jump to page
- zoom controls
- vertical scroll or page-by-page mode
- bookmark current page
- note on current page
- display current section name

Controls should include:

- `Bookmark`
- `Focus Mode`
- `Brightness`
- `Sepia`
- `Night`
- `Go to Section`

The reading screen must feel uncluttered.
By default, controls should disappear after a short delay.

### 3. Sections

Purpose: make a long PDF feel navigable and approachable.

Key modules:

- list of major sections
- page range for each section
- estimated reading time
- progress per section
- filters such as `Unread`, `In Progress`, `Completed`, `Short Reads`

This screen turns the book from a long document into manageable steps.

### 4. Journey

Purpose: motivate consistency without trivializing the text.

Key modules:

- reading streak
- completed sessions
- bookmarks
- notes
- completed sections
- plan history

This should feel reflective, not gamified.
Use language like `Sessions completed`, `Days consistent`, `Pages covered`.
Avoid achievement language like `Level up`, `XP`, or badges everywhere.

---

## Signature UX Ideas

These are the features most likely to make the app genuinely better than a simple PDF wrapper.

### 1. Resume Instantly

When the app opens, the user should see:

- last section title
- last page number
- last read time
- one-tap `Resume`

This is the highest-impact feature in the entire app.

### 2. Session-Based Reading

Instead of pushing users toward the whole book, offer small sessions:

- `2 pages`
- `5 minutes`
- `Short section`
- `Continue plan`

This lowers resistance and increases repeat usage.

### 3. Sacred Focus Mode

A special reading mode that:

- hides navigation chrome
- keeps only the page and subtle progress marker
- switches to a calm palette
- optionally locks orientation or disables accidental gestures

This should feel intentional and premium.

### 4. Gentle Completion Feedback

After a session, show something like:

- pages read
- section reached
- streak maintained
- suggestion for next session

Keep it soft and brief. The tone should be respectful, not celebratory in a gaming sense.

### 5. Structured Entry Points

Not every user wants to begin from page 1 every time.
Offer:

- `Start from beginning`
- `Continue where you left off`
- `Read today’s short portion`
- `Open a bookmarked passage`

---

## Visual Direction

The app should feel devotional and premium.

### Color System

Recommended palette:

- warm ivory for surfaces
- deep green for primary accents
- muted gold for highlights
- charcoal or dark olive for text
- sepia reading mode for long sessions

Reader mode should be visually cleaner than the rest of the app.

### Typography

Use elegant typography with clear hierarchy:

- refined serif or distinctive heading face for titles
- highly readable sans or book-style body face for UI text
- Arabic-friendly support if headings or section names include Arabic

Avoid default app-store-looking typography.

### Motion

Motion should be subtle:

- fade in cards on home
- smooth sheet transitions
- gentle progress updates

No playful bounce-heavy motion.

### Background Language

For non-reader screens:

- soft texture
- faint geometric pattern
- layered cream and green surfaces

For reader screen:

- plain and quiet
- no decorative interference near text

---

## Recommended V1 Scope

V1 should be narrow and strong.

### Include

- bundled PDF reading
- continue reading
- bookmarks
- sections list
- progress tracking
- reading plans
- sepia / night mode
- page jump

### Exclude for now

- cloud sync
- social sharing
- audio sync
- translation overlays inside the first release
- complex annotation system

The first version wins by being smooth, calm, and reliable.

---

## Content Model

Do not rely on raw page numbers alone.
Create app metadata around the PDF.

Suggested structure:

```ts
type Section = {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  estimatedMinutes: number;
  summary?: string;
};

type ReadingPlan = {
  id: string;
  title: string;
  totalDays: number;
  items: {
    day: number;
    label: string;
    startPage: number;
    endPage: number;
  }[];
};

type Bookmark = {
  id: string;
  page: number;
  label?: string;
  createdAt: string;
};

type ReadingProgress = {
  lastPage: number;
  lastSectionId?: string;
  completedPages: number[];
  streakCount: number;
  lastReadAt?: string;
};
```

This metadata layer is what makes the product smart.

---

## Suggested Technical Approach

### App Stack

- Expo Router for navigation
- React Native + NativeWind for UI
- AsyncStorage or MMKV for local persistence
- a PDF rendering package that supports page control, zoom, and stable performance on Android

### Routing Structure

Suggested app structure:

```txt
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx            // Home
    sections.tsx
    journey.tsx
  reader/
    [page].tsx
  bookmarks/
    index.tsx
  plans/
    index.tsx
```

### Data Files

Suggested local content structure:

```txt
assets/
  pdf/
    shifa-shareef.pdf
data/
  sections.ts
  plans.ts
  theme.ts
  types.ts
```

### Local Persistence

Persist:

- last page
- reading history
- bookmarks
- selected reading mode
- current plan
- section completion

Keep the first version offline-first.

---

## Screen-by-Screen UX Spec

### Home Screen

Hero card:

- title: `Continue Reading`
- subtitle: current section name
- meta: `Page 42 of 310`
- CTA: `Resume`

Secondary cards:

- `Today’s Portion`
- `Reading Plan`
- `Recent Bookmarks`
- `Read for 5 Minutes`

Bottom area:

- one short reflective line
- not a long paragraph

### Reader Screen

Top overlay:

- back
- section title
- bookmark
- more options

Bottom overlay:

- page scrubber
- current page / total pages
- quick theme toggle

Reader options sheet:

- jump to page
- jump to section
- display mode
- sepia / night / light
- focus mode

### Sections Screen

Each row should show:

- section title
- page range
- estimated reading time
- progress state

Allow sorting by:

- default order
- shortest first
- incomplete first

### Journey Screen

Top summary:

- current streak
- total pages read
- sections completed

Lists:

- bookmarks
- recent sessions
- notes

---

## Reading Plans

Reading plans are important because they convert intention into a repeatable habit.

Recommended starter plans:

### 7-Day Plan

For motivated users who want a quick structured completion.

### 21-Day Plan

Balanced and realistic for most users.

### Daily Light Plan

Very small page ranges for users building consistency.

The app should recommend the `Daily Light Plan` by default for retention.

---

## Differentiator

The app becomes compelling if it does these 3 things better than a normal PDF reader:

1. remembers exactly where the user stopped
2. converts a large text into small meaningful sessions
3. creates a peaceful focused atmosphere

If those 3 are done well, the app will already feel purposeful.

---

## Future Expansion

After V1 is stable, the best next additions are:

- synced audio recitation by page or section
- translation / explanation layer
- searchable section index
- cloud backup for bookmarks and progress
- Ramadan mode or special completion plans
- quote / passage save feature

Do not build these before the core reading loop feels excellent.

---

## Build Plan

### Phase 1

- set up tabs and routes
- add PDF asset and reader screen
- persist last page
- create basic resume flow

### Phase 2

- add metadata for sections
- build sections screen
- add bookmarks
- add reading themes

### Phase 3

- add reading plans
- add journey screen
- add session completion feedback

### Phase 4

- refine visuals
- improve performance
- polish transitions and empty states

---

## Final Recommendation

The right product is:

`a beautifully focused Shifa Shareef reading companion built on top of a PDF, with strong resume flow, section-based navigation, and gentle habit-forming progress`

If implementation starts now, the first screen to build should be `Home` with a strong `Continue Reading` card, and the second should be the `Reader`.
Those two screens define whether the app feels useful.
