import type { Activity, DateRange } from '../types';

export interface GithubConfig {
  token: string;
  username: string;
}

interface SearchItem {
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: {
    merged_at: string | null;
    html_url: string;
  };
}

interface SearchResponse {
  items: SearchItem[];
}

function repoNameFromUrl(repositoryUrl: string): string {
  // "https://api.github.com/repos/owner/repo" → "owner/repo"
  return repositoryUrl.split('/').slice(-2).join('/');
}

export async function fetchGithubActivity(
  range: DateRange,
  config: GithubConfig
): Promise<Activity[]> {
  const q = [
    `author:${config.username}`,
    'type:pr',
    `merged:${range.from}..${range.to}`,
  ].join('+');

  const url = `https://api.github.com/search/issues?q=${q}&per_page=100&sort=updated`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  const data: SearchResponse = await res.json();

  return data.items
    .filter(item => item.pull_request?.merged_at)
    .map(item => ({
      date: item.pull_request!.merged_at!.split('T')[0],
      type: 'pr' as const,
      title: item.title,
      projectHint: repoNameFromUrl(item.repository_url),
      url: item.html_url,
    }));
}
