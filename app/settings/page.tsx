'use client';

import { useState, useEffect } from 'react';
import { TOKENS_KEY, DEFAULT_MAPPINGS_KEY } from '@/lib/mapping';
import { MappingWizard } from '@/components/MappingWizard';
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKENS_KEY);
      if (t) setTokens(JSON.parse(t));
      const m = localStorage.getItem(DEFAULT_MAPPINGS_KEY);
      if (m) setMappings(JSON.parse(m));
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
