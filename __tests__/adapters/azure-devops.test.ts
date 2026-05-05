import { describe, it, expect } from 'vitest';
import { parsePullRequests } from '../../lib/adapters/azure-devops';

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
