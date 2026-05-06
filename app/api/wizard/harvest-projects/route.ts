import { NextRequest, NextResponse } from 'next/server';

interface HarvestTaskAssignment {
  task: { id: number; name: string };
}

interface HarvestProjectAssignment {
  project: { id: number; name: string };
  task_assignments: HarvestTaskAssignment[];
}

interface HarvestAssignmentsResponse {
  project_assignments: HarvestProjectAssignment[];
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-harvest-token') || process.env.HARVEST_TOKEN;
  const accountId = req.headers.get('x-harvest-account-id') || process.env.HARVEST_ACCOUNT_ID;
  if (!token || !accountId) {
    return NextResponse.json({ error: 'Missing harvest headers' }, { status: 401 });
  }

  const res = await fetch('https://api.harvestapp.com/v2/users/me/project_assignments?per_page=100', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Harvest-Account-Id': accountId,
      'User-Agent': 'Retrolog (oscar@alluxi.com)',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Harvest ${res.status}: ${body}` }, { status: res.status });
  }

  const data: HarvestAssignmentsResponse = await res.json();
  const projects = data.project_assignments.map(pa => ({
    projectId: String(pa.project.id),
    projectName: pa.project.name,
    tasks: pa.task_assignments.map(ta => ({
      taskId: String(ta.task.id),
      taskName: ta.task.name,
    })),
  }));

  return NextResponse.json({ projects });
}
