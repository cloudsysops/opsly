import { NextRequest, NextResponse } from 'next/server';
import { getAdminSecret } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin authentication not configured' }, { status: 503 });
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: string };
    token = (body.token || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!token || token !== adminSecret) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
