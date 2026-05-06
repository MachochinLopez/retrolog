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
  source?: 'holiday' | 'custom'; // holiday = synced from Google Calendar, custom = manual/PTO
  disabled?: boolean; // true = excluded from working day calculation
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
}

export interface SourceStatus {
  name: string;
  ok: boolean;
  count?: number;
  error?: string;
}

export interface ReconstructResponse {
  entries: TimeEntry[];
  workingDays: string[];
  sources: SourceStatus[];
}
