import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isStaffUser } from './staff-user';

export { isStaffUser } from './staff-user';

export type StaffAuthResult =
  | { ok: true; method: 'secret' | 'supabase'; user?: User }
  | { ok: false; status: number; error: string };

export async function validateStaffRequest(req: NextRequest): Promise<StaffAuthResult> {
  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? '';
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const cookieToken = req.cookies.get('admin-token')?.value?.trim() ?? '';

  if (adminSecret && (bearer === adminSecret || cookieToken === adminSecret)) {
    return { ok: true, method: 'secret' };
  }

  const cookieAccessToken = extractAccessTokenFromCookies(req.cookies.getAll());

  if (!bearer && !cookieAccessToken) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const token = bearer || cookieAccessToken;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    return { ok: false, status: 503, error: 'Staff auth not configured' };
  }

  try {
    const user = await fetchSupabaseUser(token);

    if (!user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
    if (!isStaffUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    return { ok: true, method: bearer ? 'supabase' : 'supabase', user };
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}

export async function validateStaffSession(): Promise<StaffAuthResult> {
  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? '';
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('admin-token')?.value?.trim() ?? '';

  if (adminSecret && cookieToken === adminSecret) {
    return { ok: true, method: 'secret' };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    return { ok: false, status: 503, error: 'Staff auth not configured' };
  }

  const cookieAccessToken = extractAccessTokenFromCookies(
    cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }))
  );

  if (!cookieAccessToken) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  try {
    const user = await fetchSupabaseUser(cookieAccessToken);

    if (!user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
    if (!isStaffUser(user)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    return { ok: true, method: 'supabase', user };
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}

function extractAccessTokenFromCookies(
  requestCookies: Array<{ name: string; value: string }>
): string {
  const authCookie = requestCookies.find(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  );
  if (!authCookie?.value) return '';

  const raw = authCookie.value.trim();
  const encoded = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw;

  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { access_token?: string };
    return typeof parsed.access_token === 'string' ? parsed.access_token.trim() : '';
  } catch {
    return '';
  }
}

async function fetchSupabaseUser(token: string): Promise<User | null> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as User;
}
