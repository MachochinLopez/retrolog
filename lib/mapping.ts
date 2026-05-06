import type { ProjectMapping } from './types';

export function findMapping(
  hint: string,
  mappings: ProjectMapping[]
): ProjectMapping | undefined {
  const lower = hint.toLowerCase();
  return mappings.find(m => lower.includes(m.hint.toLowerCase()));
}

export function applyMappings(
  hints: string[],
  mappings: ProjectMapping[]
): Array<{ hint: string; mapping: ProjectMapping | undefined }> {
  return hints.map(hint => ({ hint, mapping: findMapping(hint, mappings) }));
}

export const DEFAULT_MAPPINGS_KEY = 'retrolog-mapping';
export const NONWORKING_CACHE_KEY = 'retrolog-nonworking-days';
export const TOKENS_KEY = 'retrolog-tokens';
export const SESSION_KEY = 'retrolog-last-session';
