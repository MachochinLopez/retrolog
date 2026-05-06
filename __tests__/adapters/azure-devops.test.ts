import { describe, it, expect } from 'vitest';
import { parsePullRequests, parseCommits } from '../../lib/adapters/azure-devops';

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
});
