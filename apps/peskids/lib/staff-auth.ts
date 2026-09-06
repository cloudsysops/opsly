import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { resolvePeskidsEnvironment } from './runtime-environment';
import { isStaffUser } from './staff-user';
import { extractSupabaseAccessTokenFromCookies } from './supabase-auth-cookie';
import { timingSafeSecretsEqual } from './internal-auth';

export { isStaffUser } from './staff-user';

export type StaffAuthResult =
  | { ok: true; method: 'secret' | 'supabase'; user?: User }
  | { ok: false; status: number; error: string };

function acceptsDashboardAdminSecret(presented: string): boolean {
  const adminSecret = process.env.DASHBOARD_ADMIN_SECRET?.trim() ?? '';
  if (!adminSecret || !timingSafeSecretsEqual(presented, adminSecret)) return false;
  if (resolvePeskidsEnvironment() !== 'production') return true;
  return process.env.PESKIDS_ALLOW_DASHBOARD_ADMIN_SECRET?.trim() === '1';
}

export async function validateStaffRequest(req: NextRequest): Promise<StaffAuthResult> {
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const cookieToken = req.cookies.get('admin-token')?.value?.trim() ?? '';

  if (acceptsDashboardAdminSecret(bearer) || acceptsDashboardAdminSecret(cookieToken)) {
    return { ok: true, method: 'secret' };
  }

  const cookieAccessToken = extractSupabaseAccessTokenFromCookies(req.cookies.getAll());

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
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('admin-token')?.value?.trim() ?? '';

  if (acceptsDashboardAdminSecret(cookieToken)) {
    return { ok: true, method: 'secret' };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    return { ok: false, status: 503, error: 'Staff auth not configured' };
  }

  const cookieAccessToken = extractSupabaseAccessTokenFromCookies(
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
