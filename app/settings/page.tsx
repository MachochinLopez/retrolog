'use client';

import { useState, useEffect } from 'react';
import { TOKENS_KEY, DEFAULT_MAPPINGS_KEY, NONWORKING_CACHE_KEY } from '@/lib/mapping';
import { MappingWizard } from '@/components/MappingWizard';
import { fetchHolidays, DEFAULT_HOLIDAY_CALENDAR } from '@/lib/adapters/google-calendar';
import type { ProjectMapping, NonWorkingDaysCache, NonWorkingDay } from '@/lib/types';

interface Tokens {
  azureToken: string;
  azureOrg: string;
  azureProject: string;
  azureUserEmail: string;
  alluxiToken: string;
  harvestToken: string;
  harvestAccountId: string;
  googleApiKey: string;
  holidayCalendarId: string;
}

const DEFAULT_TOKENS: Tokens = {
  azureToken: '',
  azureOrg: '',
  azureProject: '',
  azureUserEmail: '',
  alluxiToken: '',
  harvestToken: '',
  harvestAccountId: '',
  googleApiKey: '',
  holidayCalendarId: DEFAULT_HOLIDAY_CALENDAR,
};

export default function SettingsPage() {
  const [tokens, setTokens] = useState<Tokens>(DEFAULT_TOKENS);
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [saved, setSaved] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [nwdCache, setNwdCache] = useState<NonWorkingDaysCache | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [newDay, setNewDay] = useState({ date: '', reason: '' });

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKENS_KEY);
      if (t) setTokens({ ...DEFAULT_TOKENS, ...JSON.parse(t) });
      const m = localStorage.getItem(DEFAULT_MAPPINGS_KEY);
      if (m) setMappings(JSON.parse(m));
      const nwd = localStorage.getItem(NONWORKING_CACHE_KEY);
      if (nwd) {
        const cache: NonWorkingDaysCache = JSON.parse(nwd);
        setNwdCache(cache);
        setSyncStatus(`Last synced ${new Date(cache.lastSynced).toLocaleDateString()}`);
      }
    } catch {}
  }, []);

  function saveTokens() {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateToken(field: keyof Tokens, value: string) {
    setTokens(prev => ({ ...prev, [field]: value }));
  }

  function handleWizardSave(mapping: ProjectMapping) {
    setMappings(prev => {
      const next = [...prev];
      if (editingIndex !== null) {
        next[editingIndex] = mapping;
      } else {
        next.push(mapping);
      }
      localStorage.setItem(DEFAULT_MAPPINGS_KEY, JSON.stringify(next));
      return next;
    });
    setWizardOpen(false);
    setEditingIndex(null);
  }

  function openAdd() {
    setEditingIndex(null);
    setWizardOpen(true);
  }

  function openEdit(i: number) {
    setEditingIndex(i);
    setWizardOpen(true);
  }

  function saveCache(cache: NonWorkingDaysCache) {
    localStorage.setItem(NONWORKING_CACHE_KEY, JSON.stringify(cache));
    setNwdCache(cache);
  }

  async function syncHolidays() {
    if (!tokens.googleApiKey) {
      setSyncStatus('Error: Google API Key is required');
      return;
    }
    setSyncing(true);
    setSyncStatus(null);
    try {
      const year = new Date().getFullYear();
      const calId = tokens.holidayCalendarId || DEFAULT_HOLIDAY_CALENDAR;
      const fetched = await fetchHolidays(year, calId, tokens.googleApiKey);

      // Preserve user's disabled flags + keep custom (PTO) days
      const existing = nwdCache?.days ?? [];
      const disabledDates = new Set(existing.filter(d => d.disabled).map(d => d.date));
      const customDays = existing.filter(d => d.source === 'custom');

      const dedupMap = new Map<string, NonWorkingDay>();
      for (const d of fetched) {
        dedupMap.set(d.date, { ...d, source: 'holiday' as const, disabled: disabledDates.has(d.date) });
      }
      for (const d of customDays) {
        dedupMap.set(d.date, d);
      }
      const merged: NonWorkingDay[] = [...dedupMap.values()].sort((a, b) => a.date.localeCompare(b.date));

      saveCache({ days: merged, lastSynced: new Date().toISOString() });
      setSyncStatus(`Synced ${fetched.length} holidays for ${year}`);
    } catch (err) {
      setSyncStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  }

  function toggleDay(date: string) {
    if (!nwdCache) return;
    const updated = nwdCache.days.map(d => d.date === date ? { ...d, disabled: !d.disabled } : d);
    saveCache({ ...nwdCache, days: updated });
  }

  function addCustomDay() {
    if (!newDay.date || !newDay.reason) return;
    const day: NonWorkingDay = { date: newDay.date, reason: newDay.reason, source: 'custom' };
    const existing = nwdCache?.days ?? [];
    const merged = [...existing.filter(d => d.date !== newDay.date), day]
      .sort((a, b) => a.date.localeCompare(b.date));
    saveCache({ days: merged, lastSynced: nwdCache?.lastSynced ?? new Date().toISOString() });
    setAddingDay(false);
    setNewDay({ date: '', reason: '' });
  }

  function removeDay(date: string) {
    if (!nwdCache) return;
    saveCache({ ...nwdCache, days: nwdCache.days.filter(d => d.date !== date) });
  }

  function removeMapping(i: number) {
    setMappings(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      localStorage.setItem(DEFAULT_MAPPINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-brand">retrolog</h1>
        <a href="/" className="text-sm text-zinc-400 hover:text-zinc-600">← back</a>
      </div>

      {/* Azure DevOps */}
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Azure DevOps</h2>
      <div className="space-y-3 mb-8">
        {(
          [
            ['azureToken', 'Personal Access Token', 'PAT with Code (Read) scope'],
            ['azureOrg', 'Organization', 'e.g. jz2016'],
            ['azureProject', 'Project', 'e.g. BIP'],
            ['azureUserEmail', 'Your email (filter PRs)', 'your-azure-email@domain.com'],
          ] as [keyof Tokens, string, string][]
        ).map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="block text-xs text-zinc-400 mb-1">{label}</label>
            <input
              type={key === 'azureToken' ? 'password' : 'text'}
              className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand"
              placeholder={placeholder}
              value={tokens[key]}
              onChange={e => updateToken(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Submission targets */}
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Submission Targets</h2>
      <div className="space-y-3 mb-8">
        {(
          [
            ['alluxiToken', 'Alluxi Token (PAT)', 'axk_…'],
            ['harvestToken', 'Harvest Token', '2976238.pt…'],
            ['harvestAccountId', 'Harvest Account ID', '513966'],
          ] as [keyof Tokens, string, string][]
        ).map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="block text-xs text-zinc-400 mb-1">{label}</label>
            <input
              type={key.includes('Token') ? 'password' : 'text'}
              className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand"
              placeholder={placeholder}
              value={tokens[key]}
              onChange={e => updateToken(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={saveTokens}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded hover:bg-brand-hover"
        >
          Save tokens
        </button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>

      {/* Non-working Days */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Non-working Days</h2>
        <button
          onClick={() => setAddingDay(true)}
          className="text-xs text-zinc-400 hover:text-brand"
        >
          + Add day
        </button>
      </div>

      {/* Google Calendar sync */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Google API Key</label>
          <input
            type="password"
            className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand"
            placeholder="AIza…"
            value={tokens.googleApiKey}
            onChange={e => updateToken('googleApiKey', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Holiday calendar ID</label>
          <input
            type="text"
            className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand"
            placeholder={DEFAULT_HOLIDAY_CALENDAR}
            value={tokens.holidayCalendarId}
            onChange={e => updateToken('holidayCalendarId', e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={syncHolidays}
          disabled={syncing}
          className="px-4 py-2 text-sm font-medium rounded border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : `Sync holidays for ${new Date().getFullYear()}`}
        </button>
        {syncStatus && (
          <span className={`text-xs ${syncStatus.startsWith('Error') ? 'text-red-500' : 'text-zinc-400'}`}>
            {syncStatus}
          </span>
        )}
      </div>

      {/* Add custom day form */}
      {addingDay && (
        <div className="flex items-end gap-2 mb-4 p-3 border border-zinc-200 rounded bg-zinc-50">
          <div className="flex-1">
            <label className="block text-xs text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
              value={newDay.date}
              onChange={e => setNewDay(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-400 mb-1">Reason</label>
            <input
              type="text"
              className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
              placeholder="PTO, vacation…"
              value={newDay.reason}
              onChange={e => setNewDay(p => ({ ...p, reason: e.target.value }))}
            />
          </div>
          <button
            onClick={addCustomDay}
            className="px-3 py-1.5 bg-brand text-white text-sm rounded hover:bg-brand-hover"
          >
            Add
          </button>
          <button
            onClick={() => { setAddingDay(false); setNewDay({ date: '', reason: '' }); }}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Day list */}
      {nwdCache && nwdCache.days.length > 0 && (
        <div className="mb-10 border border-zinc-200 rounded overflow-hidden">
          {[...nwdCache.days].sort((a, b) => a.date.localeCompare(b.date)).map(d => (
            <div
              key={d.date}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-zinc-100 last:border-b-0 ${d.disabled ? 'opacity-40' : ''}`}
            >
              <input
                type="checkbox"
                checked={!d.disabled}
                onChange={() => toggleDay(d.date)}
                className="accent-brand"
              />
              <span className="font-mono text-xs text-zinc-400 w-24 shrink-0">{d.date}</span>
              <span className="text-sm text-zinc-700 flex-1">{d.reason}</span>
              {d.source === 'custom' && (
                <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">PTO</span>
              )}
              {d.source === 'custom' && (
                <button onClick={() => removeDay(d.date)} className="text-xs text-zinc-300 hover:text-red-400">×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {(!nwdCache || nwdCache.days.length === 0) && (
        <p className="text-xs text-zinc-400 mb-10">No days synced yet. Add Google API key and sync, or add manually.</p>
      )}

      {/* Project mappings */}
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-1">Project Mappings</h2>
      <p className="text-xs text-zinc-400 mb-4">
        Map a keyword from your repo name to Alluxi + Harvest projects. Save tokens first.
      </p>

      {mappings.length > 0 && (
        <div className="space-y-2 mb-4">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center justify-between border border-zinc-200 rounded px-4 py-3 bg-white">
              <div>
                <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded mr-2">{m.hint}</span>
                <span className="text-sm text-zinc-700">{m.label}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => openEdit(i)} className="text-zinc-400 hover:text-brand">Edit</button>
                <button onClick={() => removeMapping(i)} className="text-zinc-400 hover:text-red-400">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {wizardOpen ? (
        <MappingWizard
          initial={editingIndex !== null ? mappings[editingIndex] : undefined}
          onSave={handleWizardSave}
          onCancel={() => { setWizardOpen(false); setEditingIndex(null); }}
        />
      ) : (
        <button
          onClick={openAdd}
          className="text-sm text-zinc-500 border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          + Add mapping
        </button>
      )}
    </div>
  );
}
