# Data Sources

## GitHub (Phase 1)
- **Auth**: PAT — `Authorization: Bearer $GITHUB_TOKEN`
- **Endpoint**: `GET https://api.github.com/search/issues`
- **Query**: `author:{username}+type:pr+merged:{from}..{to}`
- **Key fields**: `title`, `pull_request.merged_at`, `repository_url`, `html_url`
- **Adapter**: `lib/adapters/github.ts`

## Azure DevOps (Phase 2 — Oscar's current external project)
- **Auth**: PAT as Basic auth (`Authorization: Basic base64(user:PAT)`) or Bearer
- **PR endpoint**: `GET https://dev.azure.com/{org}/{project}/_apis/git/pullrequests`
  - `searchCriteria.creatorId={userId}` + `searchCriteria.status=completed`
- **Work items**: `GET /_apis/work/workitems?ids={ids}&api-version=7.1`
- **User ID**: `GET https://dev.azure.com/{org}/_apis/connectionData`
- **Adapter**: `lib/adapters/azure-devops.ts` (not yet built)

## Jira (Phase 2)
- **Auth**: Atlassian API token — Basic auth with email:token, Base64 encoded
- **Endpoint**: `GET https://{domain}.atlassian.net/rest/api/3/search`
- **JQL**: `assignee = currentUser() AND updated >= {from} AND updated <= {to}`
- **Adapter**: `lib/adapters/jira.ts` (not yet built)

## Google Calendar (Phase 2)
- **Auth**: OAuth2 — client ID + secret from Google Cloud Console
- **Meetings**: `GET /calendar/v3/calendars/primary/events?timeMin=...&timeMax=...`
  - Filter: `status != "cancelled"`, duration > 0
- **Mexico holidays**: `calendarId=en.mx%23holiday%40group.v.calendar.google.com`
  - Fetched once/year, cached as `retrolog-nonworking-days` in localStorage
- **Adapter**: `lib/adapters/google-calendar.ts` (not yet built)
