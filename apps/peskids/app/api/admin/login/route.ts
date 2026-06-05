import { NextRequest } from 'next/server';
import { getAdminSecret } from '@/lib/admin-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return errorJson(requestId, 'Admin authentication not configured', 503);
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: string };
    token = (body.token || '').trim();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  if (!token || token !== adminSecret) {
    return errorJson(requestId, 'Invalid token', 401);
  }

  const response = successJson(requestId, { ok: true });
  response.cookies.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
