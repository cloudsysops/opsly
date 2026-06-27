import { NextResponse } from 'next/server';

export async function POST(): Promise<Response> {
  const response = NextResponse.json({ ok: true });

  response.cookies.set('admin-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
