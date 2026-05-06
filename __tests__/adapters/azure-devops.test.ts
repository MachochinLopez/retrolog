import { describe, it, expect } from 'vitest';
import { parsePullRequests, parseActivePullRequests, parseCommits, extractTicketRef } from '../../lib/adapters/azure-devops';

describe('extractTicketRef', () => {
  it('handles AB# format', () => {
    const r = extractTicketRef('AB#1478 Fix auth bug');
    expect(r).toEqual({ id: '1478', cleanTitle: 'Fix auth bug' });
  });
  it('handles bracketed format', () => {
    const r = extractTicketRef('[1478] Fix auth bug');
    expect(r).toEqual({ id: '1478', cleanTitle: 'Fix auth bug' });
  });
  it('handles leading number with colon', () => {
    const r = extractTicketRef('1478: Fix auth bug');
    expect(r).toEqual({ id: '1478', cleanTitle: 'Fix auth bug' });
  });
  it('handles leading number with dash', () => {
    const r = extractTicketRef('1478 - Fix auth bug');
    expect(r).toEqual({ id: '1478', cleanTitle: 'Fix auth bug' });
  });
  it('handles inline hash ref', () => {
    const r = extractTicketRef('Fix auth bug #1478');
    expect(r).toEqual({ id: '1478', cleanTitle: 'Fix auth bug' });
  });
  it('returns null id when no ticket found', () => {
    const r = extractTicketRef('Fix auth bug');
    expect(r).toEqual({ id: null, cleanTitle: 'Fix auth bug' });
  });
  it('ignores short numbers to avoid false positives', () => {
    const r = extractTicketRef('Fix #12 typo');
    expect(r.id).toBeNull();
  });
});

const range = { from: '2026-04-01', to: '2026-04-30' };
const org = 'alluxi';
const project = 'remarkets';

const basePR = {
  pullRequestId: 1,
  title: 'Fix auth bug',
  status: 'completed' as const,
  repository: { name: 'remarkets-api' },
  createdBy: { uniqueName: 'oscar@alluxi.com', displayName: 'Oscar' },
  closedDate: '2026-04-15T10:30:00Z',
};

describe('parsePullRequests', () => {
  it('returns activity for completed PR in range', () => {
    const result = parsePullRequests([basePR], org, project, range);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      date: '2026-04-15',
      type: 'pr',
      title: 'Fix auth bug',
      projectHint: 'remarkets-api',
    });
  });

  it('builds correct web URL', () => {
    const result = parsePullRequests([basePR], org, project, range);
    expect(result[0].url).toBe(
      'https://dev.azure.com/alluxi/remarkets/_git/remarkets-api/pullrequest/1'
    );
  });

  it('excludes PR closed before range', () => {
    const pr = { ...basePR, closedDate: '2026-03-31T23:59:00Z' };
    expect(parsePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('excludes PR closed after range', () => {
    const pr = { ...basePR, closedDate: '2026-05-01T00:00:00Z' };
    expect(parsePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('excludes abandoned PR', () => {
    const pr = { ...basePR, status: 'abandoned' as const };
    expect(parsePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('excludes PR without closedDate', () => {
    const pr = { ...basePR, closedDate: undefined };
    expect(parsePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('filters by userEmail when provided', () => {
    const prs = [
      basePR,
      { ...basePR, pullRequestId: 2, createdBy: { uniqueName: 'other@alluxi.com', displayName: 'Other' } },
    ];
    const result = parsePullRequests(prs, org, project, range, 'oscar@alluxi.com');
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('/pullrequest/1');
  });

  it('email filter is case-insensitive', () => {
    const result = parsePullRequests([basePR], org, project, range, 'OSCAR@ALLUXI.COM');
    expect(result).toHaveLength(1);
  });

  it('returns all PRs when no userEmail filter', () => {
    const prs = [
      basePR,
      { ...basePR, pullRequestId: 2, createdBy: { uniqueName: 'other@alluxi.com', displayName: 'Other' } },
    ];
    expect(parsePullRequests(prs, org, project, range)).toHaveLength(2);
  });

  it('uses repo name as projectHint', () => {
    const pr = { ...basePR, repository: { name: 'dell-scholars-portal' } };
    const result = parsePullRequests([pr], org, project, range);
    expect(result[0].projectHint).toBe('dell-scholars-portal');
  });
});

const baseActivePR = {
  pullRequestId: 10,
  title: 'Add user dashboard',
  status: 'active' as const,
  repository: { name: 'remarkets-api' },
  createdBy: { uniqueName: 'oscar@alluxi.com', displayName: 'Oscar' },
  creationDate: '2026-04-20T09:00:00Z',
};

describe('parseActivePullRequests', () => {
  it('returns activity for active PR created in range', () => {
    const result = parseActivePullRequests([baseActivePR], org, project, range);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      date: '2026-04-20',
      type: 'pr',
      title: 'Add user dashboard',
      projectHint: 'remarkets-api',
    });
  });

  it('uses creationDate as activity date', () => {
    const result = parseActivePullRequests([baseActivePR], org, project, range);
    expect(result[0].date).toBe('2026-04-20');
  });

  it('excludes PR created before range', () => {
    const pr = { ...baseActivePR, creationDate: '2026-03-31T23:00:00Z' };
    expect(parseActivePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('excludes PR created after range', () => {
    const pr = { ...baseActivePR, creationDate: '2026-05-01T00:00:00Z' };
    expect(parseActivePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('excludes non-active PRs', () => {
    const pr = { ...baseActivePR, status: 'completed' as const };
    expect(parseActivePullRequests([pr], org, project, range)).toHaveLength(0);
  });

  it('filters by userEmail', () => {
    const prs = [
      baseActivePR,
      { ...baseActivePR, pullRequestId: 11, createdBy: { uniqueName: 'other@alluxi.com', displayName: 'Other' } },
    ];
    const result = parseActivePullRequests(prs, org, project, range, 'oscar@alluxi.com');
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('/pullrequest/10');
  });

  it('builds correct web URL', () => {
    const result = parseActivePullRequests([baseActivePR], org, project, range);
    expect(result[0].url).toBe(
      'https://dev.azure.com/alluxi/remarkets/_git/remarkets-api/pullrequest/10'
    );
  });

  it('email filter is case-insensitive', () => {
    const result = parseActivePullRequests([baseActivePR], org, project, range, 'OSCAR@ALLUXI.COM');
    expect(result).toHaveLength(1);
  });
});

describe('parseCommits', () => {
  const baseCommit = {
    commitId: 'abc123',
    comment: 'Fix login redirect bug',
    author: { name: 'Oscar', email: 'oscar@alluxi.com', date: '2026-04-15T10:00:00Z' },
  };

  it('returns commit activity in range', () => {
    const result = parseCommits([baseCommit], 'api-repo', range);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ date: '2026-04-15', type: 'commit', projectHint: 'api-repo' });
  });

  it('uses first line of commit message', () => {
    const commit = { ...baseCommit, comment: 'Fix thing\n\nMore details here' };
    const result = parseCommits([commit], 'api-repo', range);
    expect(result[0].title).toBe('Fix thing');
  });

  it('excludes commits outside range', () => {
    const commit = { ...baseCommit, author: { ...baseCommit.author, date: '2026-05-01T10:00:00Z' } };
    expect(parseCommits([commit], 'api-repo', range)).toHaveLength(0);
  });

  it('filters by email when provided', () => {
    const commits = [
      baseCommit,
      { ...baseCommit, commitId: 'def456', author: { ...baseCommit.author, email: 'other@alluxi.com' } },
    ];
    const result = parseCommits(commits, 'api-repo', range, 'oscar@alluxi.com');
    expect(result).toHaveLength(1);
  });

  it('groups multiple commits from same day into one activity', () => {
    const commits = [
      baseCommit,
      { ...baseCommit, commitId: 'def456', comment: 'Add tests' },
      { ...baseCommit, commitId: 'ghi789', comment: 'Refactor auth' },
    ];
    const result = parseCommits(commits, 'api-repo', range);
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('Fix login redirect bug');
    expect(result[0].title).toContain('Add tests');
  });

  it('caps at 3 messages and notes overflow', () => {
    const commits = Array.from({ length: 5 }, (_, i) => ({
      ...baseCommit,
      commitId: `id${i}`,
      comment: `Commit ${i}`,
    }));
    const result = parseCommits(commits, 'api-repo', range);
    expect(result[0].title).toContain('+2 more');
  });

  it('splits commits from different days into separate activities', () => {
    const commits = [
      baseCommit,
      { ...baseCommit, commitId: 'def456', author: { ...baseCommit.author, date: '2026-04-16T10:00:00Z' } },
    ];
    const result = parseCommits(commits, 'api-repo', range);
    expect(result).toHaveLength(2);
  });

  it('skips merge commits', () => {
    const mergeCommit = {
      ...baseCommit,
      commitId: 'merge1',
      comment: 'Merge AddTableReusableComponent into master',
    };
    const result = parseCommits([mergeCommit], 'api-repo', range);
    expect(result).toHaveLength(0);
  });

  it('skips merge commits case-insensitively', () => {
    const mergeCommit = {
      ...baseCommit,
      commitId: 'merge2',
      comment: 'merge feature-branch into develop',
    };
    const result = parseCommits([mergeCommit], 'api-repo', range);
    expect(result).toHaveLength(0);
  });

  it('keeps non-merge commits alongside merge commits in same day', () => {
    const commits = [
      baseCommit,
      { ...baseCommit, commitId: 'merge3', comment: 'Merge fix-branch into main' },
    ];
    const result = parseCommits(commits, 'api-repo', range);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Fix login redirect bug');
  });
});
