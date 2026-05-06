# Phase Progress

## Phase 1 — Core (Azure DevOps + Alluxi + Harvest)

### Done
- [x] Next.js 16 scaffold, TypeScript strict, Tailwind v4, brand color `#FF4F5E`
- [x] All shared types (`lib/types.ts`)
- [x] `lib/reconstruction.ts` — getWorkingDays, enforceEightHours, splitHoursEvenly
- [x] `lib/validation.ts` — validateDayTotals, parseClaudeOutput
- [x] `lib/mapping.ts` — findMapping, localStorage key constants
- [x] `lib/claude.ts` — reconstructTimeline (Claude API)
- [x] `lib/alluxi.ts` — submitToAlluxi, deleteAlluxiEntry
- [x] `lib/harvest.ts` — submitToHarvest
- [x] `lib/adapters/azure-devops.ts` — PRs + commits, ticket ID extraction (`[1478]` format)
- [x] `lib/adapters/azure-devops.ts` — active (open) PR support via `parseActivePullRequests`; merge commit filtering (`/^Merge\s+\S+\s+into\s+/i`); dedup active vs completed same day+repo
- [x] `lib/adapters/github.ts` — optional secondary source
- [x] `lib/mapping.ts` — added `SESSION_KEY = 'retrolog-last-session'`
- [x] All API routes: reconstruct, submit/alluxi, submit/harvest, wizard/alluxi-projects, wizard/harvest-projects
- [x] Env var fallbacks in all routes (`AZURE_TOKEN`, `ALLUXI_TOKEN`, `HARVEST_TOKEN`, etc.)
- [x] `components/ReconstructorApp.tsx` — Day/Week/Month picker, source status badges, session persistence (restore on refresh, clear on submit/re-reconstruct, "Restored from HH:MM" note)
- [x] `components/TimelineReview.tsx` — editable review table
- [x] `components/EntryRow.tsx`
- [x] `components/MappingWizard.tsx` — 4-step wizard (keyword → Alluxi → Harvest → confirm)
- [x] `app/settings/page.tsx` — Azure DevOps config, submission targets, mapping wizard
- [x] 62 unit tests passing, TypeScript clean
- [x] Azure DevOps PAT confirmed working (`jz2016/BIP`, `oscar.lopez@simpat.tech`)
- [x] Alluxi + Harvest APIs confirmed working (POST, DELETE)

### Remaining before first real submit
- [x] Add project mapping via wizard: keyword `BIP` → Alluxi ReMarkets + Harvest BIP Phase 1
- [x] End-to-end: reconstruct April 2026 → review → submit to both platforms → verify in dashboards

## Phase 1.5 — Enhancements (post-submit, pre-Phase 2)
- [ ] Pull existing entries from Alluxi + Harvest APIs before reconstruct — diff against them to avoid duplicate submission. Show "already logged" indicator per day in UI.
- [ ] Free date range selection — allow any date (including future). Note: future dates won't have source activity; user is responsible for that. No validation gate.
- [ ] Week roadmap / calendar visualizer — shows which days × which projects have time registered in both Alluxi and Harvest. Read-only overview, not edit surface.

## Phase 2 — More sources
- [x] Google Calendar adapter — `lib/adapters/google-calendar.ts`, `parseHolidayEvents` + `fetchHolidays` (API key, public holiday calendar)
- [x] Non-working days section in Settings: Google API Key field, calendar ID field, "Sync holidays for {year}" button, last-synced status
- [x] Pre-reconstruct banner showing skipped non-working days in range
- [x] Free date navigation — future dates allowed (no gate)
- [x] 67 unit tests passing
- [ ] Jira adapter (Atlassian token + JQL) — leave for last phase
- [ ] Source connection status indicators in UI

## Phase 3 — Polish + Deploy
- [ ] Vercel deploy (env vars for server-side defaults)
- [ ] Per-source failure resilience (already partially there — errors surfaced, not fatal)
- [ ] Handle multi-project Azure DevOps (multiple org/project combos)
- [ ] "Re-reconstruct" keeps manual edits (currently wipes them)

## Phase 4 — Claude Code skills
- [ ] `.claude/commands/reconstruct.md`
- [ ] `.claude/commands/submit.md`
