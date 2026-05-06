import type { Activity, DateRange } from '../types';

export interface AzureDevOpsConfig {
  pat: string;
  org: string;
  project: string;
  userEmail?: string;
}

interface AzurePR {
  pullRequestId: number;
  title: string;
  closedDate?: string;
  status: string;
  repository: { name: string };
  createdBy: { uniqueName: string; displayName: string };
}

interface AzurePRListResponse {
  value: AzurePR[];
}

function basicAuth(pat: string): string {
  return `Basic ${Buffer.from(':' + pat).toString('base64')}`;
}

function prWebUrl(org: string, project: string, repoName: string, prId: number): string {
  return `https://dev.azure.com/${org}/${project}/_git/${repoName}/pullrequest/${prId}`;
}

export function parsePullRequests(
  prs: AzurePR[],
  org: string,
  project: string,
  range: DateRange,
  userEmail?: string
): Activity[] {
  return prs
    .filter(pr => {
      if (pr.status !== 'completed') return false;
      if (!pr.closedDate) return false;
      const closedDate = pr.closedDate.split('T')[0];
      if (closedDate < range.from || closedDate > range.to) return false;
      if (userEmail && pr.createdBy.uniqueName.toLowerCase() !== userEmail.toLowerCase()) {
        return false;
      }
      return true;
    })
    .map(pr => ({
      date: pr.closedDate!.split('T')[0],
      type: 'pr' as const,
      title: pr.title,
      projectHint: pr.repository.name,
      url: prWebUrl(org, project, pr.repository.name, pr.pullRequestId),
    }));
}

export async function fetchAzureDevOpsActivity(
  range: DateRange,
  config: AzureDevOpsConfig
): Promise<Activity[]> {
  const { pat, org, project, userEmail } = config;

  // Fetch with a broad minTime (PRs created up to 90d before range may have closed in range)
  const minTime = new Date(range.from);
  minTime.setDate(minTime.getDate() - 90);
  const minTimeStr = minTime.toISOString().split('T')[0];

  const params = new URLSearchParams({
    'searchCriteria.status': 'completed',
    'searchCriteria.minTime': `${minTimeStr}T00:00:00Z`,
    '$top': '200',
    'api-version': '7.1',
  });

  const url = `https://dev.azure.com/${org}/${project}/_apis/git/pullrequests?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: basicAuth(pat) },
    redirect: 'follow',
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || !contentType.includes('application/json')) {
    if (!res.ok && res.status === 401) {
      throw new Error('Azure DevOps: invalid or expired PAT — check token in Settings');
    }
    if (!res.ok && res.status === 404) {
      throw new Error(`Azure DevOps: org "${org}" or project "${project}" not found`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('Azure DevOps: got HTML response — invalid PAT, org, or project name');
    }
    const body = await res.text();
    throw new Error(`Azure DevOps ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: AzurePRListResponse = await res.json();
  return parsePullRequests(data.value, org, project, range, userEmail);
}
