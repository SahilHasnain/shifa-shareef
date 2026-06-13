export type Section = {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  estimatedMinutes: number;
  description: string;
};

export type ReadingPlanItem = {
  day: number;
  label: string;
  startPage: number;
  endPage: number;
  estimatedMinutes: number;
};

export type ReadingPlan = {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  pagesPerDay: number;
  items: ReadingPlanItem[];
};

export type ReadingProgress = {
  lastPage: number;
  lastReadAt?: string;
};

export type Bookmark = {
  id: string;
  languageId: string;
  volumeId: string;
  page: number;
  label?: string;
  createdAt: string;
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
  plans: ReadingPlan[];
  format: "image" | "epub";
};

export type Language = {
  id: string;
  title: string;
  nativeTitle?: string;
  volumes: Volume[];
};

export type VolumeProgress = {
  volumeId: string;
  lastPage: number;
  lastReadAt?: string;
  completedPages: number[];
  bookmarks: Bookmark[];
  activePlanId?: string;
  lastCfi?: string;
  progressPercent?: number;
};

export type RemoteDeliveryMode = "bundled" | "remote" | "hybrid";

export type VolumeAssetManifest = {
  id: string;
  version: string;
  totalPages: number;
  deliveryMode: RemoteDeliveryMode;
  baseUrl?: string;
  filePattern: string;
  extension: string;
  samplePages?: number[];
  hashes?: Record<string, string>;
  epubUrl?: string;
};

export type LanguageAssetManifest = {
  languageId: string;
  title: string;
  version: string;
  volumes: VolumeAssetManifest[];
};

export type PageAssetSourceKind = "bundled" | "local" | "remote" | "missing";

export type ResolvedPageAsset = {
  kind: PageAssetSourceKind;
  source?: number | { uri: string };
  uri?: string;
  cacheUri?: string;
  manifestVersion: string;
  languageId: string;
  volumeId: string;
  page: number;
};

export type AppThemePreference = "system" | "light" | "dark";
