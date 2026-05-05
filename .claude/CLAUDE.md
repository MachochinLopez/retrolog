# Retrolog — AI Time Reconstructor

Retrolog reads your actual work artifacts (GitHub PRs, Azure DevOps, Jira, Google Calendar) and reconstructs time entries for a given date range, then submits to **Alluxi Time Tracker** and **Harvest** simultaneously.

## Key invariants (never break these)
- Each working day MUST total exactly 8.0h — enforced in `lib/reconstruction.ts:enforceEightHours`
- Holidays from Google Calendar cache + weekends → zero entries for those days
- Hour split across tasks is flexible; day total is not

## Current phase
See `.claude/docs/phase-progress.md`

## Tech stack
- Next.js 16 App Router (NOT Pages Router)
- React 19 — use `'use client'` for interactive components
- TypeScript strict mode
- Tailwind v4 — CSS-first config, `@theme inline` in `app/globals.css`, no `tailwind.config.js`
- Brand color `#FF4F5E` → use `text-brand`, `bg-brand`, `bg-brand-hover`
- Vitest for unit tests — run with `npm test`
- Claude API via `@anthropic-ai/sdk` (model: `claude-sonnet-4-6`)

## Project structure
```
lib/types.ts          — all shared TypeScript interfaces
lib/reconstruction.ts — pure functions: getWorkingDays, enforceEightHours, splitHoursEvenly
lib/validation.ts     — validateDayTotals, parseClaudeOutput
lib/mapping.ts        — findMapping, applyMappings, localStorage key constants
lib/claude.ts         — reconstructTimeline (calls Claude API)
lib/alluxi.ts         — submitToAlluxi
lib/harvest.ts        — submitToHarvest
lib/adapters/github.ts — fetchGithubActivity
app/api/reconstruct/  — orchestrates sources → Claude → JSON
app/api/submit/       — alluxi/ and harvest/ submission routes
components/ReconstructorApp.tsx — main client component, all app state
components/TimelineReview.tsx   — editable table
components/EntryRow.tsx         — single editable row
app/settings/page.tsx — token + project mapping config
```

## Token passing (Phase 1)
Tokens stored in `localStorage` under key `retrolog-tokens` (see `lib/mapping.ts`).
Client reads them and passes as request headers to API routes:
- `x-github-token`, `x-alluxi-token`, `x-harvest-token`, `x-harvest-account-id`

## Open unknowns
- Alluxi POST body field names — see `.claude/docs/api-contracts.md`
- Azure DevOps, Jira, Google Calendar adapters — Phase 2
