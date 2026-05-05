import { describe, it, expect } from 'vitest';
import { validateDayTotals, parseClaudeOutput } from '../lib/validation';
import type { TimeEntry } from '../lib/types';

function makeEntry(date: string, hours: number): TimeEntry {
  return { id: `${date}-test`, date, description: 'test', hours, projectHint: '', sourceType: 'pr' };
}

describe('validateDayTotals', () => {
  it('returns no errors when days total 8h', () => {
    const entries = [makeEntry('2026-05-04', 4), makeEntry('2026-05-04', 4)];
    expect(validateDayTotals(entries)).toHaveLength(0);
  });

  it('reports error when day total differs from 8h', () => {
    const entries = [makeEntry('2026-05-04', 3), makeEntry('2026-05-04', 3)];
    const errors = validateDayTotals(entries);
    expect(errors).toHaveLength(1);
    expect(errors[0].date).toBe('2026-05-04');
    expect(errors[0].actual).toBeCloseTo(6);
  });

  it('handles multiple days, reports only bad ones', () => {
    const entries = [
      makeEntry('2026-05-04', 4),
      makeEntry('2026-05-04', 4),
      makeEntry('2026-05-05', 5),
    ];
    const errors = validateDayTotals(entries);
    expect(errors).toHaveLength(1);
    expect(errors[0].date).toBe('2026-05-05');
  });
});

describe('parseClaudeOutput', () => {
  it('parses plain JSON array', () => {
    const raw = JSON.stringify([
      { date: '2026-05-04', description: 'Fix bug', hours: 8, projectHint: 'myrepo', sourceType: 'pr' },
    ]);
    const result = parseClaudeOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-05-04');
    expect(result[0].hours).toBe(8);
  });

  it('parses JSON wrapped in markdown code block', () => {
    const raw = '```json\n[{"date":"2026-05-04","description":"Fix bug","hours":8,"projectHint":"r","sourceType":"pr"}]\n```';
    const result = parseClaudeOutput(raw);
    expect(result).toHaveLength(1);
  });

  it('throws on missing required fields', () => {
    const raw = JSON.stringify([{ description: 'No date' }]);
    expect(() => parseClaudeOutput(raw)).toThrow();
  });

  it('throws when response contains no JSON array', () => {
    expect(() => parseClaudeOutput('Sorry, I cannot help with that.')).toThrow();
  });

  it('throws on malformed JSON', () => {
    expect(() => parseClaudeOutput('[{invalid json')).toThrow();
  });

  it('defaults sourceType to pr when missing', () => {
    const raw = JSON.stringify([
      { date: '2026-05-04', description: 'Work', hours: 8, projectHint: '' },
    ]);
    const result = parseClaudeOutput(raw);
    expect(result[0].sourceType).toBe('pr');
  });
});
