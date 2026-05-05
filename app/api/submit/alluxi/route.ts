import { NextRequest, NextResponse } from 'next/server';
import { submitToAlluxi } from '@/lib/alluxi';
import type { TimeEntry, ProjectMapping } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { entry, mapping }: { entry: TimeEntry; mapping: ProjectMapping } = await req.json();

    const token = req.headers.get('x-alluxi-token');
    if (!token) {
      return NextResponse.json({ error: 'Missing x-alluxi-token header' }, { status: 401 });
    }

    const entryId = await submitToAlluxi(entry, mapping, { token });
    return NextResponse.json({ success: true, entryId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
