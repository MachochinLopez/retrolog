import { describe, it, expect } from 'vitest';
import { getWorkingDays, enforceEightHours, splitHoursEvenly, groupByDate } from '../lib/reconstruction';
import type { TimeEntry, NonWorkingDay } from '../lib/types';

function makeEntry(overrides: Partial<TimeEntry> & { date: string; hours: number }): TimeEntry {
  return {
    id: `${overrides.date}-${Math.random()}`,
    description: 'test',
    projectHint: 'test',
    sourceType: 'pr',
    ...overrides,
  };
}

describe('getWorkingDays', () => {
  it('excludes weekends', () => {
    const days = getWorkingDays({ from: '2026-05-04', to: '2026-05-10' }, []);
    // May 4 Mon, 5 Tue, 6 Wed, 7 Thu, 8 Fri — weekend: 9 Sat, 10 Sun
    expect(days).toEqual(['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08']);
  });

  it('excludes non-working days from cache', () => {
    const nwd: NonWorkingDay[] = [{ date: '2026-05-05', reason: 'Holiday' }];
    const days = getWorkingDays({ from: '2026-05-04', to: '2026-05-08' }, nwd);
    expect(days).not.toContain('2026-05-05');
    expect(days).toHaveLength(4);
  });

  it('returns empty array when entire range is non-working', () => {
    const days = getWorkingDays({ from: '2026-05-09', to: '2026-05-10' }, []);
    expect(days).toHaveLength(0);
  });

  it('handles a single working day', () => {
    const days = getWorkingDays({ from: '2026-05-04', to: '2026-05-04' }, []);
    expect(days).toEqual(['2026-05-04']);
  });
});

describe('enforceEightHours', () => {
  it('leaves entries already summing to 8h unchanged', () => {
    const entries = [
      makeEntry({ date: '2026-05-04', hours: 4 }),
      makeEntry({ date: '2026-05-04', hours: 4 }),
    ];
    const result = enforceEightHours(entries);
    expect(result.reduce((s, e) => s + e.hours, 0)).toBeCloseTo(8);
  });

  it('adjusts last entry when day total is off', () => {
    const entries = [
      makeEntry({ date: '2026-05-04', hours: 3 }),
      makeEntry({ date: '2026-05-04', hours: 3 }),
    ];
    const result = enforceEightHours(entries);
    const total = result.filter(e => e.date === '2026-05-04').reduce((s, e) => s + e.hours, 0);
    expect(total).toBeCloseTo(8);
  });

  it('adjusts each day independently', () => {
    const entries = [
      makeEntry({ date: '2026-05-04', hours: 5 }),
      makeEntry({ date: '2026-05-05', hours: 7 }),
    ];
    const result = enforceEightHours(entries);
    const day1 = result.filter(e => e.date === '2026-05-04').reduce((s, e) => s + e.hours, 0);
    const day2 = result.filter(e => e.date === '2026-05-05').reduce((s, e) => s + e.hours, 0);
    expect(day1).toBeCloseTo(8);
    expect(day2).toBeCloseTo(8);
  });

  it('does not produce negative hours', () => {
    const entries = [
      makeEntry({ date: '2026-05-04', hours: 10 }),
      makeEntry({ date: '2026-05-04', hours: 1 }),
    ];
    const result = enforceEightHours(entries);
    const negativeHours = result.filter(e => e.hours < 0);
    expect(negativeHours).toHaveLength(0);
  });
});

describe('splitHoursEvenly', () => {
  it('splits evenly across count', () => {
    const result = splitHoursEvenly(8, 2);
    expect(result[0]).toBeCloseTo(4);
    expect(result[1]).toBeCloseTo(4);
  });

  it('handles single item', () => {
    const result = splitHoursEvenly(8, 1);
    expect(result).toEqual([8]);
  });

  it('handles zero count', () => {
    const result = splitHoursEvenly(8, 0);
    expect(result).toEqual([]);
  });

  it('total of split equals input', () => {
    const hours = splitHoursEvenly(7, 3);
    const total = hours.reduce((s, h) => s + h, 0);
    expect(total).toBeCloseTo(7);
  });
});

describe('groupByDate', () => {
  it('groups items by date', () => {
    const items = [
      { date: '2026-05-04', value: 1 },
      { date: '2026-05-04', value: 2 },
      { date: '2026-05-05', value: 3 },
    ];
    const map = groupByDate(items);
    expect(map.get('2026-05-04')).toHaveLength(2);
    expect(map.get('2026-05-05')).toHaveLength(1);
  });
});
