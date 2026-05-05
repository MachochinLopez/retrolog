import type { TimeEntry, ProjectMapping } from './types';

export interface HarvestConfig {
  token: string;
  accountId: string;
}

export async function submitToHarvest(
  entry: TimeEntry,
  mapping: ProjectMapping,
  config: HarvestConfig
): Promise<string> {
  const payload = {
    project_id: Number(mapping.harvestProjectId),
    task_id: Number(mapping.harvestTaskId),
    spent_date: entry.date,
    hours: entry.hours,
    notes: entry.description,
  };

  const res = await fetch('https://api.harvestapp.com/v2/time_entries', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Harvest-Account-Id': config.accountId,
      'User-Agent': 'Retrolog (oscar@alluxi.com)',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Harvest ${res.status}: ${body}`);
  }

  const data = await res.json();
  return String(data.id);
}
