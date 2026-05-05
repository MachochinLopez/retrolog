# API Contracts

## Harvest (confirmed)
Base URL: `https://api.harvestapp.com/v2/`
Auth: `Authorization: Bearer $TOKEN` + `Harvest-Account-Id: $ACCOUNT_ID`

### POST /v2/time_entries
```json
{
  "project_id": 14307913,   // required, integer
  "task_id": 8083365,       // required, integer
  "spent_date": "2026-05-04", // required, ISO 8601 date
  "hours": 4.0,             // optional decimal, omit to start timer
  "notes": "string"         // optional
}
```
Response: `{ "id": 12345, ... }`

## Alluxi Time Tracker (UNKNOWN — needs discovery)
Base URL: `https://time.alluxi.com`
Auth: `Authorization: Bearer $PAT`

### GET /api/time-entries?weekDate=YYYY-MM-DD
Lists entries for week containing weekDate.

### POST /api/time-entries
**Field names unknown.** Run this to discover:
```bash
curl -X POST https://time.alluxi.com/api/time-entries \
  -H "Authorization: Bearer YOUR_PAT" \
  -H "Content-Type: application/json" \
  -d '{}'
```
The 422 validation error response will list required fields.

**Update `lib/alluxi.ts:AlluxiPayload` interface after discovery.**
