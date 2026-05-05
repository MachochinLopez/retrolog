import type { TimeEntry } from './types';

export interface DayTotalError {
  date: string;
  expected: number;
  actual: number;
}

export function validateDayTotals(entries: TimeEntry[]): DayTotalError[] {
  const byDate = new Map<string, number>();
  for (const entry of entries) {
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.hours);
  }

  const errors: DayTotalError[] = [];
  for (const [date, total] of byDate) {
    if (Math.abs(total - 8.0) > 0.01) {
      errors.push({ date, expected: 8.0, actual: Math.round(total * 100) / 100 });
    }
  }
  return errors;
}

export function parseClaudeOutput(raw: string): Omit<TimeEntry, 'id'>[] {
  // Extract JSON from response — may be wrapped in markdown code blocks
  const codeBlockMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const arrayMatch = raw.match(/(\[[\s\S]*\])/);
  const jsonText = codeBlockMatch?.[1] ?? arrayMatch?.[1];

  if (!jsonText) throw new Error('No JSON array found in Claude response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Claude response contains invalid JSON');
  }

  if (!Array.isArray(parsed)) throw new Error('Claude response is not a JSON array');

  return parsed.map((item: unknown, i: number) => {
    if (!item || typeof item !== 'object') throw new Error(`Entry ${i} is not an object`);
    const obj = item as Record<string, unknown>;

    if (!obj.date || !obj.description || obj.hours === undefined) {
      throw new Error(`Entry ${i} missing required fields: date, description, hours`);
    }

    return {
      date: String(obj.date),
      description: String(obj.description),
      hours: Number(obj.hours),
      projectHint: String(obj.projectHint ?? ''),
      sourceType: (obj.sourceType as TimeEntry['sourceType']) ?? 'pr',
    };
  });
}
