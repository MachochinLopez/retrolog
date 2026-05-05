import { describe, it, expect } from 'vitest';
import { findMapping, applyMappings } from '../lib/mapping';
import type { ProjectMapping } from '../lib/types';

const mappings: ProjectMapping[] = [
  {
    hint: 'alluxi-platform',
    alluxiProjectId: '1',
    alluxiTag: '10',
    harvestProjectId: '100',
    harvestTaskId: '1000',
    label: 'Alluxi — Platform',
  },
  {
    hint: 'client-x',
    alluxiProjectId: '2',
    alluxiTag: '20',
    harvestProjectId: '200',
    harvestTaskId: '2000',
    label: 'Client X — Dev',
  },
];

describe('findMapping', () => {
  it('finds exact hint match', () => {
    const m = findMapping('alluxi-platform', mappings);
    expect(m?.label).toBe('Alluxi — Platform');
  });

  it('finds partial match (hint is substring of projectHint)', () => {
    const m = findMapping('org/alluxi-platform', mappings);
    expect(m?.label).toBe('Alluxi — Platform');
  });

  it('is case-insensitive', () => {
    const m = findMapping('ALLUXI-PLATFORM', mappings);
    expect(m?.label).toBe('Alluxi — Platform');
  });

  it('returns undefined when no match', () => {
    const m = findMapping('unknown-repo', mappings);
    expect(m).toBeUndefined();
  });
});

describe('applyMappings', () => {
  it('maps matched hints and leaves unmatched as undefined', () => {
    const hints = ['alluxi-platform', 'unknown-repo'];
    const result = applyMappings(hints, mappings);
    expect(result[0].mapping?.label).toBe('Alluxi — Platform');
    expect(result[1].mapping).toBeUndefined();
  });
});
