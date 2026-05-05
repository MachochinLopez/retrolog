import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeOutput } from './validation';
import { enforceEightHours } from './reconstruction';
import type { Activity, TimeEntry, NonWorkingDay } from './types';

const client = new Anthropic();

interface ReconstructionInput {
  workingDays: string[];
  activitiesByDay: Map<string, Activity[]>;
  nonWorkingDays: NonWorkingDay[];
}

function buildPrompt(input: ReconstructionInput): string {
  const { workingDays, activitiesByDay, nonWorkingDays } = input;

  const nonWorkingSection =
    nonWorkingDays.length > 0
      ? nonWorkingDays.map(d => `  ${d.date}: ${d.reason}`).join('\n')
      : '  (none)';

  const activitiesSection = workingDays
    .map(date => {
      const acts = activitiesByDay.get(date) ?? [];
      if (acts.length === 0) {
        return `  ${date}:\n    (no signals — assign 8h as "Development work")`;
      }
      const lines = acts.map(a => {
        if (a.type === 'meeting') {
          return `    - Meeting: "${a.title}" (${a.durationMinutes ?? 0}min, hint: ${a.projectHint})`;
        }
        return `    - ${a.type === 'pr' ? 'PR merged' : a.type}: "${a.title}" (hint: ${a.projectHint})`;
      });
      return `  ${date}:\n${lines.join('\n')}`;
    })
    .join('\n');

  return `You are a time tracking assistant. Generate time entries for a developer based on their actual work activity.

Working days:
${workingDays.join(', ')}

Non-working days (DO NOT create entries for these):
${nonWorkingSection}

Activity signals by day:
${activitiesSection}

RULES:
1. Each working day MUST total EXACTLY 8.0 hours. Non-negotiable.
2. Meeting durations are exact (from calendar). Subtract from 8h to get coding hours.
3. Split remaining coding hours EQUALLY across coding tasks for that day.
4. Days with no signals: assign all 8h as "Development work" with projectHint "unknown".
5. Clean up titles: remove PR numbers, issue IDs, ticket prefixes if redundant. Keep meaning.
6. Hours must have at most 1 decimal place.
7. Output ONLY a JSON array. No explanation, no markdown prose.

Output format:
[
  {
    "date": "YYYY-MM-DD",
    "description": "short clean task description",
    "hours": 4.0,
    "projectHint": "repo-or-project-name",
    "sourceType": "pr"
  }
]`;
}

export async function reconstructTimeline(input: ReconstructionInput): Promise<TimeEntry[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(input) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const raw = parseClaudeOutput(content.text);
  const withIds: TimeEntry[] = raw.map((e, i) => ({
    ...e,
    id: `${e.date}-${i}`,
  }));

  return enforceEightHours(withIds);
}
