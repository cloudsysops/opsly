import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Proxy a la API de control (`GET /api/sprints/active`) con JWT del portal.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  if (!apiBase) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL is not configured' }, { status: 500 });
  }

  const upstream = await fetch(`${apiBase}/api/sprints/active`, {
    method: 'GET',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
