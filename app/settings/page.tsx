'use client';

import { useState, useEffect } from 'react';
import { TOKENS_KEY, DEFAULT_MAPPINGS_KEY } from '@/lib/mapping';
import type { ProjectMapping } from '@/lib/types';

interface Tokens {
  azureToken: string;
  azureOrg: string;
  azureProject: string;
  azureUserEmail: string;
  alluxiToken: string;
  harvestToken: string;
  harvestAccountId: string;
}

const DEFAULT_TOKENS: Tokens = {
  azureToken: '',
  azureOrg: '',
  azureProject: '',
  azureUserEmail: '',
  alluxiToken: '',
  harvestToken: '',
  harvestAccountId: '',
};

export default function SettingsPage() {
  const [tokens, setTokens] = useState<Tokens>(DEFAULT_TOKENS);
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKENS_KEY);
      if (t) setTokens(JSON.parse(t));
      const m = localStorage.getItem(DEFAULT_MAPPINGS_KEY);
      if (m) setMappings(JSON.parse(m));
    } catch {}
  }, []);

  function save() {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    localStorage.setItem(DEFAULT_MAPPINGS_KEY, JSON.stringify(mappings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addMapping() {
    setMappings(prev => [
      ...prev,
      { hint: '', alluxiProjectId: '', alluxiTag: 'development', harvestProjectId: '', harvestTaskId: '', label: '' },
    ]);
  }

  function removeMapping(i: number) {
    setMappings(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateMapping(i: number, field: keyof ProjectMapping, value: string) {
    setMappings(prev => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  function updateToken(field: keyof Tokens, value: string) {
    setTokens(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-brand">retrolog</h1>
        <a href="/" className="text-sm text-zinc-400 hover:text-zinc-600">← back</a>
      </div>

      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Azure DevOps</h2>

      <div className="space-y-3 mb-8">
        {(
          [
            ['azureToken', 'Azure PAT', 'Personal Access Token'],
            ['azureOrg', 'Organization', 'e.g. alluxi'],
            ['azureProject', 'Project', 'e.g. remarkets'],
            ['azureUserEmail', 'Your Email (filter PRs)', 'oscar@alluxi.com'],
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

      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Submission Targets</h2>

      <div className="space-y-3 mb-8">
        {(
          [
            ['alluxiToken', 'Alluxi Token (PAT)', 'axk_…'],
            ['harvestToken', 'Harvest Token', '2976238.pt…'],
            ['harvestAccountId', 'Harvest Account ID', '1234567'],
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

      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
        Project Mapping
      </h2>
      <p className="text-xs text-zinc-400 mb-4">
        Map a keyword from your repo/project name to Alluxi and Harvest project IDs.
      </p>

      <div className="space-y-4 mb-4">
        {mappings.map((m, i) => (
          <div key={i} className="border border-zinc-200 rounded p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['hint', 'Keyword (e.g. "remarkets")'],
                  ['label', 'Display label (e.g. "ReMarkets")'],
                  ['alluxiProjectId', 'Alluxi Project ID'],
                  ['alluxiTag', 'Alluxi Tag (default: development)'],
                  ['harvestProjectId', 'Harvest Project ID'],
                  ['harvestTaskId', 'Harvest Task ID'],
                ] as [keyof ProjectMapping, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                  <input
                    className="w-full border border-zinc-200 rounded px-2 py-1 text-sm outline-none focus:border-brand"
                    value={m[field]}
                    onChange={e => updateMapping(i, field, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => removeMapping(i)}
              className="text-xs text-zinc-400 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addMapping}
        className="text-sm text-zinc-500 border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50 mb-8"
      >
        + Add mapping
      </button>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded hover:bg-brand-hover"
        >
          Save
        </button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
    </div>
  );
}
