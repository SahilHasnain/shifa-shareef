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
  volumeId: string;
  page: number;
  label?: string;
  createdAt: string;
};

export type ReadingSession = {
  id: string;
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
};

export type VolumeProgress = {
  volumeId: string;
  lastPage: number;
  lastReadAt?: string;
  completedPages: number[];
  bookmarks: Bookmark[];
  activePlanId?: string;
};
