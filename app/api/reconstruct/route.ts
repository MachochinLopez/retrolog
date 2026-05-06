import { NextRequest, NextResponse } from 'next/server';
import { fetchGithubActivity } from '@/lib/adapters/github';
import { fetchAzureDevOpsActivity } from '@/lib/adapters/azure-devops';
import { reconstructTimeline } from '@/lib/claude';
import { getWorkingDays, groupByDate } from '@/lib/reconstruction';
import type { ReconstructRequest, Activity, SourceStatus } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: ReconstructRequest = await req.json();
    const { range, nonWorkingDays } = body;

    const azureToken = req.headers.get('x-azure-token') || process.env.AZURE_TOKEN;
    const azureOrg = req.headers.get('x-azure-org') || process.env.AZURE_ORG;
    const azureProject = req.headers.get('x-azure-project') || process.env.AZURE_PROJECT;
    const azureUserEmail = req.headers.get('x-azure-user-email') || process.env.AZURE_USER_EMAIL;
    const githubToken = req.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
    const githubUsername = req.headers.get('x-github-username') || process.env.GITHUB_USERNAME;

    const workingDays = getWorkingDays(range, nonWorkingDays);
    if (workingDays.length === 0) {
      return NextResponse.json({ entries: [], workingDays: [], sources: [] });
    }

    const allActivities: Activity[] = [];
    const sources: SourceStatus[] = [];

    // Azure DevOps — primary source
    if (azureToken && azureOrg && azureProject) {
      try {
        const acts = await fetchAzureDevOpsActivity(range, {
          pat: azureToken,
          org: azureOrg,
          project: azureProject,
          userEmail: azureUserEmail ?? undefined,
        });
        allActivities.push(...acts);
        sources.push({ name: 'Azure DevOps', ok: true, count: acts.length });
      } catch (err) {
        sources.push({
          name: 'Azure DevOps',
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // GitHub — optional secondary source
    if (githubToken && githubUsername) {
      try {
        const acts = await fetchGithubActivity(range, { token: githubToken, username: githubUsername });
        allActivities.push(...acts);
        sources.push({ name: 'GitHub', ok: true, count: acts.length });
      } catch (err) {
        sources.push({
          name: 'GitHub',
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const activitiesByDay = groupByDate(allActivities);
    const entries = await reconstructTimeline({ workingDays, activitiesByDay, nonWorkingDays });

    return NextResponse.json({ entries, workingDays, sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
