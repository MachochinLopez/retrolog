'use client';

import { useState, useEffect } from 'react';
import { TOKENS_KEY } from '@/lib/mapping';
import type { ProjectMapping } from '@/lib/types';

interface AlluxiProject { id: string; name: string; code: string }
interface HarvestTask { taskId: string; taskName: string }
interface HarvestProject { projectId: string; projectName: string; tasks: HarvestTask[] }

interface Props {
  initial?: ProjectMapping;
  onSave: (m: ProjectMapping) => void;
  onCancel: () => void;
}

const ALLUXI_TAGS = ['development', 'design', 'qa', 'management', 'meetings', 'other'];
const STEPS = ['Keyword', 'Alluxi', 'Harvest', 'Confirm'];

function loadTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function MappingWizard({ initial, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0);

  // Step 1 — keyword + label
  const [hint, setHint] = useState(initial?.hint ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');

  // Step 2 — Alluxi
  const [alluxiProjects, setAlluxiProjects] = useState<AlluxiProject[]>([]);
  const [alluxiProjectId, setAlluxiProjectId] = useState(initial?.alluxiProjectId ?? '');
  const [alluxiTag, setAlluxiTag] = useState(initial?.alluxiTag ?? 'development');
  const [alluxiLoading, setAlluxiLoading] = useState(false);
  const [alluxiError, setAlluxiError] = useState('');

  // Step 3 — Harvest
  const [harvestProjects, setHarvestProjects] = useState<HarvestProject[]>([]);
  const [harvestProjectId, setHarvestProjectId] = useState(initial?.harvestProjectId ?? '');
  const [harvestTaskId, setHarvestTaskId] = useState(initial?.harvestTaskId ?? '');
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [harvestError, setHarvestError] = useState('');

  const tokens = loadTokens();

  useEffect(() => {
    if (step === 1 && alluxiProjects.length === 0 && !alluxiLoading) {
      setAlluxiLoading(true);
      setAlluxiError('');
      fetch('/api/wizard/alluxi-projects', {
        headers: { 'x-alluxi-token': tokens.alluxiToken ?? '' },
      })
        .then(r => r.json())
        .then(d => {
          if (d.error) { setAlluxiError(d.error); return; }
          setAlluxiProjects(d.projects);
          if (!alluxiProjectId && d.projects.length > 0) setAlluxiProjectId(d.projects[0].id);
        })
        .catch(e => setAlluxiError(String(e)))
        .finally(() => setAlluxiLoading(false));
    }
  }, [step]);

  useEffect(() => {
    if (step === 2 && harvestProjects.length === 0 && !harvestLoading) {
      setHarvestLoading(true);
      setHarvestError('');
      fetch('/api/wizard/harvest-projects', {
        headers: {
          'x-harvest-token': tokens.harvestToken ?? '',
          'x-harvest-account-id': tokens.harvestAccountId ?? '',
        },
      })
        .then(r => r.json())
        .then(d => {
          if (d.error) { setHarvestError(d.error); return; }
          setHarvestProjects(d.projects);
          if (!harvestProjectId && d.projects.length > 0) {
            setHarvestProjectId(d.projects[0].projectId);
            setHarvestTaskId(d.projects[0].tasks[0]?.taskId ?? '');
          }
        })
        .catch(e => setHarvestError(String(e)))
        .finally(() => setHarvestLoading(false));
    }
  }, [step]);

  const selectedHarvestProject = harvestProjects.find(p => p.projectId === harvestProjectId);

  function handleHarvestProjectChange(pid: string) {
    setHarvestProjectId(pid);
    const proj = harvestProjects.find(p => p.projectId === pid);
    setHarvestTaskId(proj?.tasks[0]?.taskId ?? '');
  }

  function handleSave() {
    onSave({ hint, label, alluxiProjectId, alluxiTag, harvestProjectId, harvestTaskId });
  }

  const alluxiProjectName = alluxiProjects.find(p => p.id === alluxiProjectId)?.name ?? alluxiProjectId;
  const harvestProjectName = selectedHarvestProject?.projectName ?? harvestProjectId;
  const harvestTaskName = selectedHarvestProject?.tasks.find(t => t.taskId === harvestTaskId)?.taskName ?? harvestTaskId;

  const canNext0 = hint.trim().length > 0 && label.trim().length > 0;
  const canNext1 = alluxiProjectId.length > 0;
  const canNext2 = harvestProjectId.length > 0 && harvestTaskId.length > 0;

  return (
    <div className="border border-zinc-200 rounded-lg p-5 bg-zinc-50">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              i === step ? 'bg-brand text-white' : i < step ? 'bg-brand/20 text-brand' : 'bg-zinc-200 text-zinc-400'
            }`}>
              {i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="text-zinc-200 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Step 0 — keyword */}
      {step === 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Keyword — substring from your repo or PR name
            </label>
            <input
              className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
              placeholder='e.g. "remarkets" or "bip"'
              value={hint}
              onChange={e => setHint(e.target.value)}
              autoFocus
            />
            <p className="mt-1 text-xs text-zinc-400">
              Any PR or repo containing this word (case-insensitive) maps to this project.
            </p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Display label</label>
            <input
              className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
              placeholder='e.g. "ReMarkets — Dev"'
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 1 — Alluxi */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 mb-2">Which Alluxi project does <strong>{hint}</strong> map to?</p>
          {alluxiLoading && <p className="text-xs text-zinc-400">Loading projects…</p>}
          {alluxiError && <p className="text-xs text-red-500">{alluxiError}</p>}
          {!alluxiLoading && !alluxiError && (
            <>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Project</label>
                <select
                  className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
                  value={alluxiProjectId}
                  onChange={e => setAlluxiProjectId(e.target.value)}
                >
                  {alluxiProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Tag</label>
                <select
                  className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
                  value={alluxiTag}
                  onChange={e => setAlluxiTag(e.target.value)}
                >
                  {ALLUXI_TAGS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2 — Harvest */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 mb-2">Which Harvest project + task for <strong>{hint}</strong>?</p>
          {harvestLoading && <p className="text-xs text-zinc-400">Loading projects…</p>}
          {harvestError && <p className="text-xs text-red-500">{harvestError}</p>}
          {!harvestLoading && !harvestError && (
            <>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Project</label>
                <select
                  className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
                  value={harvestProjectId}
                  onChange={e => handleHarvestProjectChange(e.target.value)}
                >
                  {harvestProjects.map(p => (
                    <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Task</label>
                <select
                  className="w-full border border-zinc-200 rounded px-3 py-1.5 text-sm outline-none focus:border-brand bg-white"
                  value={harvestTaskId}
                  onChange={e => setHarvestTaskId(e.target.value)}
                >
                  {(selectedHarvestProject?.tasks ?? []).map(t => (
                    <option key={t.taskId} value={t.taskId}>{t.taskName}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-zinc-500 mb-3">Review and save mapping:</p>
          <div className="bg-white border border-zinc-200 rounded p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Keyword</span>
              <span className="font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded">{hint}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Label</span>
              <span>{label}</span>
            </div>
            <div className="border-t border-zinc-100 my-2" />
            <div className="flex justify-between">
              <span className="text-zinc-400">Alluxi project</span>
              <span>{alluxiProjectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Alluxi tag</span>
              <span className="font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded">{alluxiTag}</span>
            </div>
            <div className="border-t border-zinc-100 my-2" />
            <div className="flex justify-between">
              <span className="text-zinc-400">Harvest project</span>
              <span>{harvestProjectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Harvest task</span>
              <span>{harvestTaskName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between mt-5">
        <button
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          className="text-sm text-zinc-400 hover:text-zinc-600"
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !canNext0 : step === 1 ? !canNext1 : !canNext2}
            className="px-4 py-1.5 bg-brand text-white text-sm rounded hover:bg-brand-hover disabled:opacity-40"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-brand text-white text-sm font-medium rounded hover:bg-brand-hover"
          >
            Save mapping
          </button>
        )}
      </div>
    </div>
  );
}
