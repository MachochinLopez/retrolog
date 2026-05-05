export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export type ActivityType = 'pr' | 'commit' | 'ticket' | 'meeting';

export interface Activity {
  date: string;
  type: ActivityType;
  title: string;
  projectHint: string;
  durationMinutes?: number;
  url?: string;
}

export interface TimeEntry {
  id: string;
  date: string;
  description: string;
  hours: number;
  projectHint: string;
  sourceType: ActivityType;
}

export interface ProjectMapping {
  hint: string;
  alluxiProjectId: string;
  alluxiTag: string;        // Alluxi uses tags not tasks (e.g. "development")
  harvestProjectId: string;
  harvestTaskId: string;
  label: string;
}

export interface NonWorkingDay {
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface NonWorkingDaysCache {
  days: NonWorkingDay[];
  lastSynced: string; // ISO datetime
}

export type SubmitTarget = 'alluxi' | 'harvest';

export interface SubmitResult {
  target: SubmitTarget;
  entryId: string;
  success: boolean;
  error?: string;
}

export interface ReconstructRequest {
  range: DateRange;
  nonWorkingDays: NonWorkingDay[];
  githubUsername?: string;
}

export interface ReconstructResponse {
  entries: TimeEntry[];
  workingDays: string[];
  sourcesUsed: string[];
}
