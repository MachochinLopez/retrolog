# Phase Progress

## Phase 1 — Scaffold + Core (GitHub only)

### Done
- [x] Next.js 16 scaffold with TypeScript + Tailwind v4
- [x] `lib/types.ts` — all shared interfaces
- [x] `lib/reconstruction.ts` — getWorkingDays, enforceEightHours, splitHoursEvenly
- [x] `lib/validation.ts` — validateDayTotals, parseClaudeOutput
- [x] `lib/mapping.ts` — findMapping, localStorage key constants
- [x] `lib/claude.ts` — reconstructTimeline
- [x] `lib/alluxi.ts` — submitToAlluxi
- [x] `lib/harvest.ts` — submitToHarvest
- [x] `lib/adapters/github.ts` — fetchGithubActivity
- [x] `app/api/reconstruct/route.ts`
- [x] `app/api/submit/alluxi/route.ts`
- [x] `app/api/submit/harvest/route.ts`
- [x] `components/ReconstructorApp.tsx` — full app state machine
- [x] `components/TimelineReview.tsx` — editable review table
- [x] `components/EntryRow.tsx`
- [x] `app/settings/page.tsx` — token + project mapping config
- [x] Unit tests for reconstruction, validation, mapping
- [x] `vitest.config.ts`
- [x] `.claude/` docs structure

### TODO (Phase 1 completion)
- [ ] Discover Alluxi POST body schema (curl test with real PAT) → update `api-contracts.md` + `lib/alluxi.ts`
- [ ] Run tests: `npm test`
- [ ] Run dev server and verify UI renders: `npm run dev`
- [ ] End-to-end test with real GitHub PAT for a known past month

## Phase 2 — More sources
- [ ] Google Calendar adapter (OAuth2, holiday detection)
- [ ] Azure DevOps adapter (PAT, PRs + work items)
- [ ] Jira adapter (Atlassian token)
- [ ] Source connection status UI
- [ ] Non-working days Settings section with "Sync from Calendar" button

## Phase 3 — Polish + Deploy
- [ ] Vercel deploy
- [ ] Per-source failure resilience (one source down → others work)

## Phase 4 — Claude Code integration
- [ ] `.claude/commands/reconstruct.md` skill
- [ ] `.claude/commands/submit.md` skill
