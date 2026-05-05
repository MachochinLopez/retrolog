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
- [x] Discover Alluxi POST body schema → updated `api-contracts.md` + `lib/alluxi.ts`
- [x] Discover Alluxi DELETE endpoint: `DELETE /api/time-entries?id={entryId}` → added `deleteAlluxiEntry`
- [x] Confirm Harvest POST + DELETE working
- [x] Run tests: `npm test` — 27 passing
- [x] Dev server renders; TypeScript clean
- [x] Build Azure DevOps adapter (`lib/adapters/azure-devops.ts`) — primary source, 10 tests
- [x] Azure DevOps wired into reconstruct route (primary), GitHub kept as optional secondary
- [x] Settings UI updated: Azure DevOps section (PAT, org, project, email), GitHub removed
- [ ] Set Azure DevOps PAT + org + project + email in Settings UI
- [ ] Set project mappings in Settings UI: ReMarkets→Alluxi `cmoaftn5f000004kvu7vnkkcl`, Harvest `47980995`
- [ ] End-to-end test: reconstruct a known past month with real Azure DevOps data

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
