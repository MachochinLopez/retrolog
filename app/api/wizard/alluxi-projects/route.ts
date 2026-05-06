import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-alluxi-token') || process.env.ALLUXI_TOKEN;
  if (!token) return NextResponse.json({ error: 'Missing x-alluxi-token' }, { status: 401 });

  const res = await fetch('https://time.alluxi.com/api/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Alluxi ${res.status}: ${body}` }, { status: res.status });
  }

  const data = await res.json();
  const projects = (data.projects ?? []).map((p: { id: string; name: string; code: string }) => ({
    id: p.id,
    name: p.name,
    code: p.code,
  }));

  return NextResponse.json({ projects });
}
