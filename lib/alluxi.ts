import type { TimeEntry, ProjectMapping } from './types';

export interface AlluxiConfig {
  token: string;
  baseUrl?: string;
}

interface AlluxiPayload {
  projectId: string;
  entryDate: string;  // ISO date string YYYY-MM-DD
  hours: number;
  notes?: string;
  tag?: string;       // e.g. "development"
}

export async function submitToAlluxi(
  entry: TimeEntry,
  mapping: ProjectMapping,
  config: AlluxiConfig
): Promise<string> {
  const baseUrl = config.baseUrl ?? 'https://time.alluxi.com';

  const payload: AlluxiPayload = {
    projectId: mapping.alluxiProjectId,
    entryDate: entry.date,
    hours: entry.hours,
    notes: entry.description,
    tag: mapping.alluxiTag || 'development',
  };

  const res = await fetch(`${baseUrl}/api/time-entries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alluxi ${res.status}: ${body}`);
  }

  const data = await res.json();
  return String(data.entry?.id ?? data.id ?? 'unknown');
}

export async function deleteAlluxiEntry(
  entryId: string,
  config: AlluxiConfig
): Promise<void> {
  const baseUrl = config.baseUrl ?? 'https://time.alluxi.com';
  const res = await fetch(`${baseUrl}/api/time-entries?id=${entryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alluxi DELETE ${res.status}: ${body}`);
  }
}
