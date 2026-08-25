import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  adaptCanonicalPeskidsSession,
  PESKIDS_TENANT_SLUG,
  toFranchiseUiSession,
  unitIdsForScope,
  type CanonicalPeskidsSession,
  type FranchiseMembership,
  type FranchiseUiSession,
} from './franchise-session';

export class FranchiseSessionError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    message: string
  ) {
    super(message);
    this.name = 'FranchiseSessionError';
  }
}

function accessTokenFromRequest(request: NextRequest): string {
  const authorization = request.headers.get('authorization') ?? '';
  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  const cookies = request.cookies.getAll();
  const chunks = cookies
    .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
    .sort((left, right) => {
      const chunk = (name: string) => {
        const match = name.match(/\.(\d+)$/);
        return match ? Number(match[1]) : -1;
      };
      return chunk(left.name) - chunk(right.name);
    })
    .map((cookie) => cookie.value)
    .join('');
  if (!chunks) return '';

  const encoded = chunks.startsWith('base64-') ? chunks.slice(7) : chunks;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as {
      access_token?: unknown;
    };
    return typeof parsed.access_token === 'string' ? parsed.access_token.trim() : '';
  } catch {
    return '';
  }
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new FranchiseSessionError(503, 'Canonical Peskids auth is not configured');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticatedUser(request: NextRequest): Promise<User> {
  const token = accessTokenFromRequest(request);
  if (!token) throw new FranchiseSessionError(401, 'Authentication required');

  const client = serviceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new FranchiseSessionError(401, 'Authentication required');
  return data.user;
}

export async function resolveCanonicalFranchiseSession(request: NextRequest): Promise<{
  canonical: CanonicalPeskidsSession;
  ui: FranchiseUiSession;
}> {
  const user = await authenticatedUser(request);
  const client = serviceClient();
  const { data, error } = await client
    .schema('platform')
    .from('peskids_franchise_staff_memberships')
    .select('user_id, franchise_id, role, active, tenant_slug')
    .eq('tenant_slug', PESKIDS_TENANT_SLUG)
    .eq('user_id', user.id)
    .eq('active', true);

  if (error) throw new FranchiseSessionError(503, 'Franchise membership lookup failed');
  const canonical = adaptCanonicalPeskidsSession({
    user,
    memberships: (data ?? []) as FranchiseMembership[],
  });
  if (!canonical) throw new FranchiseSessionError(403, 'Franchise unit access denied');
  return { canonical, ui: toFranchiseUiSession(canonical, user) };
}

export async function listAuthorizedFranchiseUnits(session: CanonicalPeskidsSession) {
  const client = serviceClient();
  const scope = unitIdsForScope(session);
  let query = client
    .schema('platform')
    .from('peskids_franchises')
    .select('id, slug, name, type, status')
    .eq('tenant_slug', PESKIDS_TENANT_SLUG)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (scope !== 'all') {
    if (scope.length === 0) return [];
    query = query.in('id', scope);
  }

  const { data: units, error } = await query;
  if (error) throw new FranchiseSessionError(503, 'Franchise unit lookup failed');
  const unitIds = (units ?? []).map((unit) => unit.id);
  if (unitIds.length === 0) return [];

  const { data: locations, error: locationsError } = await client
    .schema('platform')
    .from('peskids_franchise_locations')
    .select('franchise_id, name, kind, city')
    .eq('tenant_slug', PESKIDS_TENANT_SLUG)
    .eq('active', true)
    .in('franchise_id', unitIds);
  if (locationsError) throw new FranchiseSessionError(503, 'Franchise location lookup failed');

  return (units ?? []).map((unit) => ({
    id: unit.id,
    slug: unit.slug,
    name: unit.name,
    type: unit.type,
    status: unit.status,
    locations: (locations ?? [])
      .filter((location) => location.franchise_id === unit.id)
      .map((location) => ({ name: location.name, kind: location.kind, city: location.city })),
  }));
}
