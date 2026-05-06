'use client';

import { useState, useCallback } from 'react';
import {
  format,
  startOfMonth, endOfMonth, addMonths,
  startOfWeek, endOfWeek, addWeeks,
  addDays,
} from 'date-fns';
import { TimelineReview } from './TimelineReview';
import { NONWORKING_CACHE_KEY, TOKENS_KEY, DEFAULT_MAPPINGS_KEY } from '@/lib/mapping';
import type {
  TimeEntry,
  ProjectMapping,
  NonWorkingDay,
  NonWorkingDaysCache,
  SubmitResult,
  SourceStatus,
} from '@/lib/types';

type Phase = 'idle' | 'reconstructing' | 'review' | 'submitting' | 'done';
type RangeMode = 'day' | 'week' | 'month';

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getRange(mode: RangeMode, offset: number): { from: string; to: string; label: string } {
  const base = new Date();
  if (mode === 'day') {
    const d = addDays(base, offset);
    const s = format(d, 'yyyy-MM-dd');
    return { from: s, to: s, label: format(d, 'EEE, MMM d yyyy') };
  }
  if (mode === 'week') {
    const d = addWeeks(base, offset);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
      label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
    };
  }
  const d = addMonths(base, offset);
  return {
    from: format(startOfMonth(d), 'yyyy-MM-dd'),
    to: format(endOfMonth(d), 'yyyy-MM-dd'),
    label: format(d, 'MMMM yyyy'),
  };
}

export function ReconstructorApp() {
  const [mode, setMode] = useState<RangeMode>('week');
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [nonWorkingDays, setNonWorkingDays] = useState<NonWorkingDay[]>([]);
  const [submitResults, setSubmitResults] = useState<SubmitResult[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const range = getRange(mode, offset);
  const mappings: ProjectMapping[] =
    loadFromStorage<ProjectMapping[]>(DEFAULT_MAPPINGS_KEY) ?? [];

  // Get non-working days for the current range from cache
  function getNonWorkingForRange(): NonWorkingDay[] {
    const cache = loadFromStorage<NonWorkingDaysCache>(NONWORKING_CACHE_KEY);
    if (!cache) return [];
    return cache.days.filter(d => d.date >= range.from && d.date <= range.to);
  }

  async function handleReconstruct() {
    setError(null);
    setSources([]);
    setPhase('reconstructing');

    const nwd = getNonWorkingForRange();
    setNonWorkingDays(nwd);

    const tokens = loadFromStorage<Record<string, string>>(TOKENS_KEY) ?? {};
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tokens.azureToken) headers['x-azure-token'] = tokens.azureToken;
    if (tokens.azureOrg) headers['x-azure-org'] = tokens.azureOrg;
    if (tokens.azureProject) headers['x-azure-project'] = tokens.azureProject;
    if (tokens.azureUserEmail) headers['x-azure-user-email'] = tokens.azureUserEmail;

    try {
      const res = await fetch('/api/reconstruct', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          range: { from: range.from, to: range.to },
          nonWorkingDays: nwd,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reconstruction failed');

      setEntries(data.entries);
      setWorkingDays(data.workingDays);
      setSources(data.sources ?? []);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPhase('idle');
    }
  }

  const handleUpdate = useCallback(
    (id: string, field: keyof TimeEntry, value: string | number) => {
      setEntries(prev =>
        prev.map(e => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleAddRow = useCallback((date: string) => {
    const newEntry: TimeEntry = {
      id: `${date}-${Date.now()}`,
      date,
      description: '',
      hours: 0,
      projectHint: '',
      sourceType: 'pr',
    };
    setEntries(prev => {
      // Insert after the last entry for this date
      const lastIdx = prev.map(e => e.date).lastIndexOf(date);
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newEntry);
      return next;
    });
  }, []);

  async function handleSubmit() {
    setPhase('submitting');
    const tokens = loadFromStorage<Record<string, string>>(TOKENS_KEY) ?? {};
    const results: SubmitResult[] = [];

    for (const entry of entries) {
      const mapping = mappings.find(m =>
        entry.projectHint.toLowerCase().includes(m.hint.toLowerCase())
      );
      if (!mapping) continue;

      // Submit to Alluxi
      if (tokens.alluxiToken) {
        try {
          const res = await fetch('/api/submit/alluxi', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-alluxi-token': tokens.alluxiToken,
            },
            body: JSON.stringify({ entry, mapping }),
          });
          const data = await res.json();
          results.push({
            target: 'alluxi',
            entryId: entry.id,
            success: data.success,
            error: data.error,
          });
        } catch (err) {
          results.push({
            target: 'alluxi',
            entryId: entry.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Submit to Harvest
      if (tokens.harvestToken && tokens.harvestAccountId) {
        try {
          const res = await fetch('/api/submit/harvest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-harvest-token': tokens.harvestToken,
              'x-harvest-account-id': tokens.harvestAccountId,
            },
            body: JSON.stringify({ entry, mapping }),
          });
          const data = await res.json();
          results.push({
            target: 'harvest',
            entryId: entry.id,
            success: data.success,
            error: data.error,
          });
        } catch (err) {
          results.push({
            target: 'harvest',
            entryId: entry.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    setSubmitResults(results);
    setPhase('done');
  }

  const failed = submitResults.filter(r => !r.success);
  const succeeded = submitResults.filter(r => r.success);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-brand">retrolog</h1>
        <a href="/settings" className="text-sm text-zinc-400 hover:text-zinc-600">
          settings
        </a>
      </div>

      {/* Range mode + navigator */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex gap-1 text-sm">
          {(['day', 'week', 'month'] as RangeMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setOffset(0); }}
              className={`px-3 py-1 rounded capitalize ${
                mode === m
                  ? 'bg-brand text-white'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
              disabled={phase === 'reconstructing' || phase === 'submitting'}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOffset(o => o - 1)}
            className="text-zinc-400 hover:text-zinc-600 px-1"
            disabled={phase === 'reconstructing' || phase === 'submitting'}
          >
            ←
          </button>
          <span className="text-sm font-medium w-48 text-center">{range.label}</span>
          <button
            onClick={() => setOffset(o => Math.min(o + 1, 0))}
            className="text-zinc-400 hover:text-zinc-600 px-1 disabled:opacity-30"
            disabled={offset >= 0 || phase === 'reconstructing' || phase === 'submitting'}
          >
            →
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* Actions */}
      {(phase === 'idle' || phase === 'review') && (
        <button
          onClick={handleReconstruct}
          className="mb-6 px-4 py-2 bg-brand text-white text-sm font-medium rounded hover:bg-brand-hover"
        >
          Reconstruct {range.label}
        </button>
      )}

      {phase === 'reconstructing' && (
        <p className="mb-6 text-sm text-zinc-500">Analyzing your work activity…</p>
      )}

      {/* Source status */}
      {phase === 'review' && sources.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {sources.map(s => (
            <div
              key={s.name}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                s.ok
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              <span>{s.ok ? '✓' : '✗'}</span>
              <span>{s.name}</span>
              {s.ok && s.count !== undefined && (
                <span className="opacity-60">({s.count} PRs)</span>
              )}
              {!s.ok && s.error && (
                <span className="opacity-75 max-w-xs truncate" title={s.error}>
                  — {s.error}
                </span>
              )}
            </div>
          ))}
          {sources.length === 0 && (
            <span className="text-xs text-zinc-400">No sources configured — entries are generic.</span>
          )}
        </div>
      )}

      {/* Review table */}
      {phase === 'review' && entries.length > 0 && (
        <>
          <TimelineReview
            entries={entries}
            workingDays={workingDays}
            nonWorkingDays={nonWorkingDays}
            mappings={mappings}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onAddRow={handleAddRow}
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-brand text-white text-sm font-medium rounded hover:bg-brand-hover"
            >
              Submit to All
            </button>
            <button
              onClick={handleReconstruct}
              className="px-4 py-2 text-sm text-zinc-500 border border-zinc-200 rounded hover:bg-zinc-50"
            >
              Re-reconstruct
            </button>
          </div>
        </>
      )}

      {phase === 'submitting' && (
        <p className="text-sm text-zinc-500">Submitting entries…</p>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div>
          <div className="mb-4 text-sm">
            <span className="text-green-600 font-medium">{succeeded.length} submitted</span>
            {failed.length > 0 && (
              <span className="text-red-500 font-medium ml-3">{failed.length} failed</span>
            )}
          </div>
          {failed.length > 0 && (
            <ul className="mb-4 text-xs text-red-500 space-y-1">
              {failed.map((r, i) => (
                <li key={i}>{r.target}: {r.error}</li>
              ))}
            </ul>
          )}
          <button
            onClick={() => { setPhase('idle'); setEntries([]); }}
            className="px-4 py-2 text-sm text-zinc-500 border border-zinc-200 rounded hover:bg-zinc-50"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
