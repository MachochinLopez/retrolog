import { eachDayOfInterval, isWeekend, parseISO, format } from 'date-fns';
import type { DateRange, NonWorkingDay, TimeEntry } from './types';

export function getWorkingDays(range: DateRange, nonWorkingDays: NonWorkingDay[]): string[] {
  const nonWorkingSet = new Set(nonWorkingDays.map(d => d.date));
  const interval = {
    start: parseISO(range.from),
    end: parseISO(range.to),
  };

  return eachDayOfInterval(interval)
    .filter(day => !isWeekend(day))
    .map(day => format(day, 'yyyy-MM-dd'))
    .filter(date => !nonWorkingSet.has(date));
}

export function enforceEightHours(entries: TimeEntry[]): TimeEntry[] {
  const byDate = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const group = byDate.get(entry.date) ?? [];
    group.push(entry);
    byDate.set(entry.date, group);
  }

  const result: TimeEntry[] = [];
  for (const dayEntries of byDate.values()) {
    const total = dayEntries.reduce((sum, e) => sum + e.hours, 0);
    if (Math.abs(total - 8.0) < 0.01) {
      result.push(...dayEntries);
      continue;
    }
    // Adjust last entry so the day totals exactly 8.0
    const adjusted = [...dayEntries];
    const lastIdx = adjusted.length - 1;
    const othersTotal = adjusted.slice(0, lastIdx).reduce((sum, e) => sum + e.hours, 0);
    adjusted[lastIdx] = {
      ...adjusted[lastIdx],
      hours: Math.round(Math.max(0, 8.0 - othersTotal) * 100) / 100,
    };
    result.push(...adjusted);
  }

  return result;
}

export function splitHoursEvenly(totalHours: number, count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [totalHours];

  const base = Math.floor((totalHours / count) * 2) / 2; // floor to nearest 0.5
  const hours = Array(count).fill(base);
  const remainder = Math.round((totalHours - base * count) * 100) / 100;
  hours[count - 1] = Math.round((base + remainder) * 100) / 100;
  return hours;
}

export function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const group = map.get(item.date) ?? [];
    group.push(item);
    map.set(item.date, group);
  }
  return map;
}
