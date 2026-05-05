import { NextRequest, NextResponse } from 'next/server';
import { fetchGithubActivity } from '@/lib/adapters/github';
import { reconstructTimeline } from '@/lib/claude';
import { getWorkingDays, groupByDate } from '@/lib/reconstruction';
import type { ReconstructRequest, Activity } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: ReconstructRequest = await req.json();
    const { range, nonWorkingDays, githubUsername } = body;

    const githubToken = req.headers.get('x-github-token');

    const workingDays = getWorkingDays(range, nonWorkingDays);
    if (workingDays.length === 0) {
      return NextResponse.json({ entries: [], workingDays: [], sourcesUsed: [] });
    }

    const allActivities: Activity[] = [];
    const sourcesUsed: string[] = [];

    // GitHub — only if token + username provided
    if (githubToken && githubUsername) {
      try {
        const ghActivity = await fetchGithubActivity(range, {
          token: githubToken,
          username: githubUsername,
        });
        allActivities.push(...ghActivity);
        sourcesUsed.push('github');
      } catch (err) {
        console.error('GitHub fetch failed:', err);
        // non-fatal — continue without GitHub
      }
    }

    const activitiesByDay = groupByDate(allActivities);

    const entries = await reconstructTimeline({
      workingDays,
      activitiesByDay,
      nonWorkingDays,
    });

    return NextResponse.json({ entries, workingDays, sourcesUsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
