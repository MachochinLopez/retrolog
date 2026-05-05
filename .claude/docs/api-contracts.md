# API Contracts

## Alluxi Time Tracker (confirmed via curl 2026-05-05)
Base URL: `https://time.alluxi.com`
Auth: `Authorization: Bearer $PAT`

### GET /api/time-entries?weekDate=YYYY-MM-DD
Returns `{ entries: [...] }` for the week containing weekDate.

### POST /api/time-entries
```json
{
  "projectId": "cmoaftn5f000004kvu7vnkkcl",   // required, string (cuid)
  "entryDate": "2026-05-04",                   // required, ISO date string
  "hours": 8,                                  // required, number
  "notes": "Fix auth bug in dashboard",        // optional, description
  "tag": "development"                         // optional, defaults to "development"
}
```
Response: `{ "id": "cmXXX...", "projectId": "...", "entryDate": "...", "hours": "8", ... }`

Note: NO taskId field. Alluxi uses `tag` instead of task hierarchy.

### Known Projects (Oscar's org as of 2026-05-05)
| ID | Name | Code |
|----|------|------|
| `cmngf2zop000004juwb7qsvjq` | Dell Scholars | DS |
| `cmoaftn5f000004kvu7vnkkcl` | ReMarkets - Simpat | RS |

---

## Harvest (confirmed via curl 2026-05-05)
Base URL: `https://api.harvestapp.com/v2/`
Auth: `Authorization: Bearer $TOKEN` + `Harvest-Account-Id: $ACCOUNT_ID`
User-Agent: `Retrolog (oscar@alluxi.com)` — required header

Oscar's Harvest user ID: `4149938`
Note: Oscar is a "member" — cannot list all projects via `/v2/projects`. Discover via time entries.

### POST /v2/time_entries
```json
{
  "project_id": 47980995,      // required, integer
  "task_id": 4547359,          // required, integer
  "spent_date": "2026-05-04",  // required, ISO 8601 date
  "hours": 4.0,                // recommended decimal
  "notes": "string"            // optional
}
```
Response: `{ "id": 12345, ... }`

### Known Projects (Oscar's entries as of 2026-05-05)
| Project ID | Project Name | Task ID | Task Name |
|------------|-------------|---------|-----------|
| `47980995` | Bid Intelligence Platform Phase 1 | `4547359` | Development |
| `47222649` | DAS Connect | `4547359` | Development |

---

## Suggested Project Mapping

| Hint | Alluxi Project | Alluxi Tag | Harvest Project | Harvest Task |
|------|---------------|------------|----------------|-------------|
| `remarkets` | `cmoaftn5f000004kvu7vnkkcl` (ReMarkets - Simpat) | development | `47980995` (Bid Intelligence P1) OR `47222649` (DAS Connect) | `4547359` |
| `dell` | `cmngf2zop000004juwb7qsvjq` (Dell Scholars) | development | TBD | TBD |
