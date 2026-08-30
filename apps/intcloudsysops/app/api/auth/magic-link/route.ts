/**
 * POST /api/auth/magic-link
 *
 * Internal server-to-server only — requires X-Internal-Secret (or X-Webhook-Secret).
 * Generates a Supabase magic link for the given email and returns the action_link URL.
 * Called from sendNotification() and n8n to embed "Ver en la app" deep links.
 *
 * Rate-limited: at most 1 pending magic link per email per hour.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveRequestId, errorJson, successJson } from '@/lib/api-response';
import { verifyPeskidsInternalRequest } from '@/lib/internal-auth';
import { rateLimit } from '@/lib/rate-limit';

interface MagicLinkBody {
  email?: unknown;
  redirectTo?: unknown;
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = resolveRequestId(req);

  if (!verifyPeskidsInternalRequest(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? '').replace(
    /\/$/,
    ''
  );

  if (!supabaseUrl || !serviceRoleKey) {
    return errorJson(requestId, 'Magic link service not configured', 503);
  }

  let body: MagicLinkBody;
  try {
    body = (await req.json()) as MagicLinkBody;
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return errorJson(requestId, 'email is required and must be valid', 400);
  }

  if (!rateLimit(`magic-link:${email}`, 1, 60 * 60 * 1000)) {
    return errorJson(requestId, 'Too many magic link requests for this email', 429);
  }

  const rawRedirect = typeof body.redirectTo === 'string' ? body.redirectTo.trim() : '/familias/submissions';
  const redirectPath = rawRedirect.startsWith('/') ? rawRedirect : '/familias/submissions';
  const redirectTo = appUrl ? `${appUrl}${redirectPath}` : redirectPath;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.error('[magic-link] generateLink error', { email, error, request_id: requestId });
    const fallback = appUrl ? `${appUrl}/familias/login` : '/familias/login';
    return successJson(requestId, { url: fallback });
  }

  return successJson(requestId, { url: data.properties.action_link });
}
