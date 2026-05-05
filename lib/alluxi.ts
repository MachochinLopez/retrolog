import type { TimeEntry, ProjectMapping } from './types';

export interface AlluxiConfig {
  token: string;
  baseUrl?: string;
}

// Field names confirmed after curl test — update in api-contracts.md when discovered
interface AlluxiPayload {
  project_id: string;
  task_id?: string;
  date: string;
  hours: number;
  description?: string;
}

export async function submitToAlluxi(
  entry: TimeEntry,
  mapping: ProjectMapping,
  config: AlluxiConfig
): Promise<string> {
  const baseUrl = config.baseUrl ?? 'https://time.alluxi.com';

  const payload: AlluxiPayload = {
    project_id: mapping.alluxiProjectId,
    task_id: mapping.alluxiTaskId || undefined,
    date: entry.date,
    hours: entry.hours,
    description: entry.description,
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
  return String(data.id ?? data.data?.id ?? 'unknown');
}
