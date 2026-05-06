# Next Session — Two Pending Fixes

## Fix 1: Include active (open) PRs + filter merge commits

**Problem:** Only `status=completed` PRs fetched. Open PRs (e.g. PR opened today, not yet merged) are invisible.
Commit fallback picks up noisy merge commits like "Merge AddTableReusableComponent into master".

### Changes needed

**`lib/adapters/azure-devops.ts`**
- In `fetchAzureDevOpsActivity`, fetch active PRs in parallel with completed PRs (add `searchCriteria.status=active` call)
- Add `parseActivePullRequests(prs, org, project, range, userEmail)` pure fn:
  - Use `pr.creationDate.split('T')[0]` as activity date (not closedDate — doesn't exist yet)
  - Filter by date in range + userEmail as usual
  - Map to `{ type: 'pr', title: formatTitle(pr.title), projectHint: pr.repository.name, ... }`
- In `parseCommits`: skip commit messages matching `/^Merge\s+\S+\s+into\s+/i`
- Dedup: if active PR falls on same day+repo as a completed PR → drop active (completed is more descriptive)

**`__tests__/adapters/azure-devops.test.ts`**
- Tests for `parseActivePullRequests`: in range, out of range, email filter, title formatting
- Tests for merge commit filtering in `parseCommits`

---

## Fix 2: Session persistence (survive page refresh)

**Problem:** Reconstructed entries lost on refresh. Re-running wastes Claude API tokens + time.

### Changes needed

**`lib/mapping.ts`**
- Add `export const SESSION_KEY = 'retrolog-last-session';`

**`components/ReconstructorApp.tsx`**
- On mount (`useEffect([], [])`): read `SESSION_KEY` from localStorage → if found, restore:
  - `setEntries`, `setWorkingDays`, `setSources`, `setNonWorkingDays`
  - Set `mode` + `offset` to match saved range
  - Set `phase` to `'review'`
  - Set a `restoredAt` state string (shown as "Restored from HH:MM" note near reconstruct button)
- After `setPhase('review')` in `handleReconstruct`: write to localStorage:
  ```typescript
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    entries, workingDays, sources, nonWorkingDays,
    mode, offset, savedAt: new Date().toISOString()
  }));
  ```
- After submit completes (phase = 'done'): clear session: `localStorage.removeItem(SESSION_KEY)`
- "Re-reconstruct" button: clears session before re-fetching

**Stored shape:**
```typescript
interface SessionData {
  entries: TimeEntry[];
  workingDays: string[];
  sources: SourceStatus[];
  nonWorkingDays: NonWorkingDay[];
  mode: RangeMode;
  offset: number;
  savedAt: string;
}
```

---

## Verification
- `npm test` — all tests pass
- `npx tsc --noEmit` — clean
- Manual: reconstruct → refresh browser → entries restored, phase = review
- Manual: today's open PR title appears in output (not merge commit noise)
