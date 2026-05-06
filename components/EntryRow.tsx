'use client';

import { findMapping } from '@/lib/mapping';
import type { TimeEntry, ProjectMapping } from '@/lib/types';

interface EntryRowProps {
  entry: TimeEntry;
  mappings: ProjectMapping[];
  onUpdate: (id: string, field: keyof TimeEntry, value: string | number) => void;
  onDelete: (id: string) => void;
}

export function EntryRow({ entry, mappings, onUpdate, onDelete }: EntryRowProps) {
  const selectedHint = findMapping(entry.projectHint, mappings)?.hint ?? '';

  return (
    <tr className="border-b border-zinc-100">
      <td className="px-4 py-2">
        <input
          className="w-full bg-transparent border-b border-transparent focus:border-zinc-300 outline-none text-sm"
          value={entry.description}
          onChange={e => onUpdate(entry.id, 'description', e.target.value)}
        />
      </td>
      <td className="px-4 py-2 w-20">
        <input
          type="number"
          step="0.5"
          min="0"
          max="8"
          className="w-full bg-transparent border-b border-transparent focus:border-zinc-300 outline-none text-sm text-right"
          value={entry.hours}
          onChange={e => onUpdate(entry.id, 'hours', parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className="px-4 py-2 w-40">
        <select
          className="w-full bg-transparent text-sm outline-none cursor-pointer"
          value={selectedHint}
          onChange={e => onUpdate(entry.id, 'projectHint', e.target.value)}
        >
          <option value="">— unset —</option>
          {mappings.map(m => (
            <option key={m.hint} value={m.hint}>{m.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 w-8 text-right">
        <button
          onClick={() => onDelete(entry.id)}
          className="text-zinc-300 hover:text-red-400 text-sm leading-none"
          aria-label="Delete entry"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
