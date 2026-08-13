export type Section = {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  estimatedMinutes: number;
  description: string;
  /** Cached percentage range for section status and navigation */
  startProgressPercent?: number;
  endProgressPercent?: number;
  /** Precise EPUB anchors when mapped from the file */
  startCfi?: string;
  endCfi?: string;
  startHref?: string;
};

export type ReadingProgress = {
  lastCfi?: string;
  progressPercent: number;
  lastReadAt?: string;
  currentSectionId?: string;
  currentSectionTitle?: string;
};

export type Bookmark = {
  id: string;
  languageId: string;
  volumeId: string;
  label?: string;
  createdAt: string;
  cfi?: string;
  progressPercent?: number;
  /** Legacy field kept for migrated bookmarks */
  page?: number;
};

export type ReadingSession = {
  id: string;
  languageId: string;
  volumeId: string;
  date: string;
  pagesRead: number;
  startPage: number;
  endPage: number;
  durationMinutes: number;
};

export type Volume = {
  id: string;
  title: string;
  subtitle?: string;
  totalPages: number;
  sections: Section[];
};

export type Language = {
  id: string;
  title: string;
  nativeTitle?: string;
  volumes: Volume[];
};

export type VolumeProgress = {
  volumeId: string;
  lastReadAt?: string;
  lastCfi?: string;
  progressPercent?: number;
  completedPages: number[];
  bookmarks: Bookmark[];
};

export type AppThemePreference = "system" | "light" | "dark";

export type ReaderTheme = "light" | "sepia" | "dark";
