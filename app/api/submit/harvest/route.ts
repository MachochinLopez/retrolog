import { NextRequest, NextResponse } from 'next/server';
import { submitToHarvest } from '@/lib/harvest';
import type { TimeEntry, ProjectMapping } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { entry, mapping }: { entry: TimeEntry; mapping: ProjectMapping } = await req.json();

    const token = req.headers.get('x-harvest-token') || process.env.HARVEST_TOKEN;
    const accountId = req.headers.get('x-harvest-account-id') || process.env.HARVEST_ACCOUNT_ID;

    if (!token || !accountId) {
      return NextResponse.json(
        { error: 'Missing x-harvest-token or x-harvest-account-id header' },
        { status: 401 }
      );
    }

    const entryId = await submitToHarvest(entry, mapping, { token, accountId });
    return NextResponse.json({ success: true, entryId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
