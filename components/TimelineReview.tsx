'use client';

import { format, parseISO } from 'date-fns';
import type { TimeEntry, ProjectMapping, NonWorkingDay } from '@/lib/types';
import { EntryRow } from './EntryRow';

interface TimelineReviewProps {
  entries: TimeEntry[];
  workingDays: string[];
  nonWorkingDays: NonWorkingDay[];
  mappings: ProjectMapping[];
  onUpdate: (id: string, field: keyof TimeEntry, value: string | number) => void;
  onDelete: (id: string) => void;
  onAddRow: (date: string) => void;
}

function dayLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d (EEE)');
}

function dayTotal(entries: TimeEntry[], date: string): number {
  return entries
    .filter(e => e.date === date)
    .reduce((sum, e) => sum + e.hours, 0);
}

export function TimelineReview({
  entries,
  workingDays,
  nonWorkingDays,
  mappings,
  onUpdate,
  onDelete,
  onAddRow,
}: TimelineReviewProps) {
  const nonWorkingSet = new Map(nonWorkingDays.map(d => [d.date, d.reason]));

  // All dates to render: working days + non-working days within the span, sorted
  const allDates = [...new Set([
    ...workingDays,
    ...nonWorkingDays.map(d => d.date),
  ])].sort();

  return (
    <div className="border border-zinc-200 rounded overflow-hidden text-sm">
      {/* Header */}
      <div className="grid grid-cols-[1fr_5rem_9rem_2rem] border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
        <span>Description</span>
        <span className="text-right">Hours</span>
        <span>Project</span>
        <span />
      </div>

      {allDates.map(date => {
        const nonWorkingReason = nonWorkingSet.get(date);
        const dayEntries = entries.filter(e => e.date === date);
        const total = dayTotal(entries, date);
        const isOver = Math.abs(total - 8.0) > 0.01;

        if (nonWorkingReason) {
          return (
            <div key={date} className="px-4 py-2 border-b border-zinc-100 bg-zinc-50 text-zinc-400 text-xs italic">
              {dayLabel(date)} — {nonWorkingReason} (skipped)
            </div>
          );
        }

        return (
          <div key={date} className="border-b border-zinc-100">
            {/* Day header */}
            <div className="px-4 pt-2 pb-1 text-xs font-semibold text-zinc-500">
              {dayLabel(date)}
            </div>

            {/* Entries table for this day */}
            <table className="w-full">
              <tbody>
                {dayEntries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    mappings={mappings}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>

            {/* Day total + add row */}
            <div className="flex items-center justify-between px-4 py-1 bg-zinc-50">
              <button
                onClick={() => onAddRow(date)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                + add row
              </button>
              <span className={`text-xs font-medium tabular-nums ${isOver ? 'text-red-500' : 'text-zinc-400'}`}>
                {total.toFixed(1)} / 8.0h{isOver ? ' ⚠' : ' ✓'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
