import { NextRequest, NextResponse } from 'next/server';
import { eachWeekOfInterval, parseISO, format } from 'date-fns';

export interface DaySummary {
  alluxiHours: number;
  harvestHours: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 });
  }

  const alluxiToken = req.headers.get('x-alluxi-token') || process.env.ALLUXI_TOKEN;
  const harvestToken = req.headers.get('x-harvest-token') || process.env.HARVEST_TOKEN;
  const harvestAccountId = req.headers.get('x-harvest-account-id') || process.env.HARVEST_ACCOUNT_ID;

  const byDate: Record<string, DaySummary> = {};

  // Alluxi — week-based endpoint, one call per week in range
  if (alluxiToken) {
    try {
      const weeks = eachWeekOfInterval(
        { start: parseISO(from), end: parseISO(to) },
        { weekStartsOn: 1 }
      );
      for (const weekStart of weeks) {
        const weekDate = format(weekStart, 'yyyy-MM-dd');
        const res = await fetch(
          `https://time.alluxi.com/api/time-entries?weekDate=${weekDate}`,
          { headers: { Authorization: `Bearer ${alluxiToken}` } }
        );
        if (!res.ok) continue;
        const data = await res.json();
        for (const e of data.entries ?? []) {
          const date: string | undefined = e.entryDate?.slice(0, 10) ?? e.date?.slice(0, 10);
          if (!date || date < from || date > to) continue;
          byDate[date] ??= { alluxiHours: 0, harvestHours: 0 };
          byDate[date].alluxiHours += Number(e.hours ?? 0);
        }
      }
    } catch { /* surface nothing — partial data is fine */ }
  }

  // Harvest — single range call
  if (harvestToken && harvestAccountId) {
    try {
      const res = await fetch(
        `https://api.harvestapp.com/v2/time_entries?from=${from}&to=${to}`,
        {
          headers: {
            Authorization: `Bearer ${harvestToken}`,
            'Harvest-Account-Id': harvestAccountId,
            'User-Agent': 'Retrolog (oscar@alluxi.com)',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        for (const e of data.time_entries ?? []) {
          const date: string | undefined = e.spent_date?.slice(0, 10);
          if (!date || date < from || date > to) continue;
          byDate[date] ??= { alluxiHours: 0, harvestHours: 0 };
          byDate[date].harvestHours += Number(e.hours ?? 0);
        }
      }
    } catch { /* surface nothing */ }
  }

  return NextResponse.json({ byDate });
}
