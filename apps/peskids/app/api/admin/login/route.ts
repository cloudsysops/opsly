import { NextRequest } from 'next/server';
import { getAdminSecret } from '@/lib/admin-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { timingSafeSecretsEqual } from '@/lib/internal-auth';
import { getClientIdentifier, rateLimit } from '@/lib/rate-limit';
import { isProduction } from '@/lib/runtime-environment';

/**
 * POST /api/admin/login — exchanges DASHBOARD_ADMIN_SECRET for the admin cookie.
 *
 * This is the single most valuable credential in the app (a `method: 'secret'`
 * session is treated as tenant owner everywhere), so it gets:
 *  - a per-client rate limit, since it was previously an unlimited brute-force
 *    oracle against a static shared secret;
 *  - a constant-time comparison;
 *  - a structured audit line on every failure.
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return errorJson(requestId, 'Admin authentication not configured', 503, 'NOT_CONFIGURED');
  }

  const clientId = getClientIdentifier(req.headers);
  if (!rateLimit(`admin-login:${clientId}`, 5, 15 * 60 * 1000)) {
    console.warn(
      JSON.stringify({
        component: 'peskids.auth',
        event: 'admin_login_rate_limited',
        request_id: requestId,
      })
    );
    return errorJson(requestId, 'Too many attempts', 429);
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === 'string' ? body.token.trim() : '';
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  if (!token || !timingSafeSecretsEqual(token, adminSecret)) {
    console.warn(
      JSON.stringify({
        component: 'peskids.auth',
        event: 'admin_login_failed',
        request_id: requestId,
      })
    );
    return errorJson(requestId, 'Invalid token', 401);
  }

  console.info(
    JSON.stringify({
      component: 'peskids.auth',
      event: 'admin_login_succeeded',
      request_id: requestId,
    })
  );

  const response = successJson(requestId, { ok: true });
  response.cookies.set('admin-token', token, {
    httpOnly: true,
    // Environment-derived rather than NODE_ENV, so a staging build with
    // NODE_ENV=development behind HTTPS still gets a Secure cookie.
    secure: isProduction() || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
