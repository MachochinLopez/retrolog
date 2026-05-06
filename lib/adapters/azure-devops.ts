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

interface AzureCommit {
  commitId: string;
  comment: string;
  author: { name: string; email: string; date: string };
}

interface AzureCommitListResponse {
  value: AzureCommit[];
}

interface AzureRepo {
  id: string;
  name: string;
}

interface AzureRepoListResponse {
  value: AzureRepo[];
}

function basicAuth(pat: string): string {
  return `Basic ${Buffer.from(':' + pat).toString('base64')}`;
}

function prWebUrl(org: string, project: string, repoName: string, prId: number): string {
  return `https://dev.azure.com/${org}/${project}/_git/${repoName}/pullrequest/${prId}`;
}

async function getJson<T>(url: string, pat: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: basicAuth(pat) },
    redirect: 'follow',
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || !contentType.includes('application/json')) {
    if (res.status === 401) throw new Error('Azure DevOps: invalid or expired PAT');
    if (res.status === 404) throw new Error(`Azure DevOps 404: ${url}`);
    if (!contentType.includes('application/json')) {
      throw new Error('Azure DevOps: got HTML response — invalid PAT, org, or project name');
    }
    const body = await res.text();
    throw new Error(`Azure DevOps ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
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
      if (userEmail && pr.createdBy.uniqueName.toLowerCase() !== userEmail.toLowerCase()) return false;
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

export function parseCommits(
  commits: AzureCommit[],
  repoName: string,
  range: DateRange,
  userEmail?: string
): Activity[] {
  const filtered = commits.filter(c => {
    const date = c.author.date.split('T')[0];
    if (date < range.from || date > range.to) return false;
    if (userEmail && c.author.email.toLowerCase() !== userEmail.toLowerCase()) return false;
    return true;
  });

  // Group by date — one activity per (date, repo) to avoid flooding Claude with 20 entries
  const byDate = new Map<string, AzureCommit[]>();
  for (const commit of filtered) {
    const date = commit.author.date.split('T')[0];
    const group = byDate.get(date) ?? [];
    group.push(commit);
    byDate.set(date, group);
  }

  const activities: Activity[] = [];
  for (const [date, group] of byDate) {
    // Take up to 3 commit messages as context, join with " / "
    const messages = group
      .slice(0, 3)
      .map(c => c.comment.split('\n')[0].trim())
      .filter(Boolean);
    const title = messages.join(' / ') + (group.length > 3 ? ` (+${group.length - 3} more)` : '');
    activities.push({
      date,
      type: 'commit' as const,
      title,
      projectHint: repoName,
    });
  }

  return activities;
}

export async function fetchAzureDevOpsActivity(
  range: DateRange,
  config: AzureDevOpsConfig
): Promise<Activity[]> {
  const { pat, org, project, userEmail } = config;
  const base = `https://dev.azure.com/${org}/${project}/_apis`;

  // Fetch PRs (broad minTime — PRs created before range may close within it)
  const minTime = new Date(range.from);
  minTime.setDate(minTime.getDate() - 90);
  const prParams = new URLSearchParams({
    'searchCriteria.status': 'completed',
    'searchCriteria.minTime': `${minTime.toISOString().split('T')[0]}T00:00:00Z`,
    '$top': '200',
    'api-version': '7.1',
  });

  const [prData, repoData] = await Promise.all([
    getJson<AzurePRListResponse>(`${base}/git/pullrequests?${prParams}`, pat),
    getJson<AzureRepoListResponse>(`${base}/git/repositories?api-version=7.1`, pat),
  ]);

  const prActivities = parsePullRequests(prData.value, org, project, range, userEmail);

  // Fetch commits from all repos in parallel
  const commitParams = new URLSearchParams({
    'searchCriteria.fromDate': `${range.from}T00:00:00Z`,
    'searchCriteria.toDate': `${range.to}T23:59:59Z`,
    '$top': '200',
    'api-version': '7.1',
  });

  const commitResults = await Promise.allSettled(
    repoData.value.map(repo =>
      getJson<AzureCommitListResponse>(
        `${base}/git/repositories/${repo.id}/commits?${commitParams}`,
        pat
      ).then(data => parseCommits(data.value, repo.name, range, userEmail))
    )
  );

  const commitActivities = commitResults
    .filter((r): r is PromiseFulfilledResult<Activity[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // PRs take priority: remove commit activities on days already covered by a PR in the same repo
  const prDayRepo = new Set(prActivities.map(a => `${a.date}|${a.projectHint}`));
  const filteredCommits = commitActivities.filter(
    a => !prDayRepo.has(`${a.date}|${a.projectHint}`)
  );

  return [...prActivities, ...filteredCommits];
}
