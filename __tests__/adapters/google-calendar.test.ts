import { describe, it, expect } from 'vitest';
import { parseHolidayEvents } from '@/lib/adapters/google-calendar';

describe('parseHolidayEvents', () => {
  it('maps date-only events to NonWorkingDay', () => {
    const result = parseHolidayEvents([
      { id: '1', summary: 'New Year', start: { date: '2025-01-01' } },
      { id: '2', summary: 'Labour Day', start: { date: '2025-05-01' } },
    ]);
    expect(result).toEqual([
      { date: '2025-01-01', reason: 'New Year' },
      { date: '2025-05-01', reason: 'Labour Day' },
    ]);
  });

  it('falls back to dateTime for timed events', () => {
    const result = parseHolidayEvents([
      { id: '1', summary: 'Holiday', start: { dateTime: '2025-09-16T00:00:00-05:00' } },
    ]);
    expect(result[0].date).toBe('2025-09-16');
  });

  it('skips cancelled events', () => {
    const result = parseHolidayEvents([
      { id: '1', summary: 'Cancelled', start: { date: '2025-04-18' }, status: 'cancelled' },
      { id: '2', summary: 'Good Friday', start: { date: '2025-04-18' } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('Good Friday');
  });

  it('skips events with no start date', () => {
    const result = parseHolidayEvents([
      // @ts-expect-error intentional bad data
      { id: '1', summary: 'Bad', start: {} },
      { id: '2', summary: 'Good', start: { date: '2025-12-25' } },
    ]);
    expect(result).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(parseHolidayEvents([])).toEqual([]);
  });
});
