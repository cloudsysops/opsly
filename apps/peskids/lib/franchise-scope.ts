/**
 * Resolves the franchise unit scope for a Supabase user in the main peskids app.
 *
 * Owner/admin users see all franchises. Support users are scoped to their
 * membership franchise_ids. Teachers and unknown roles get no franchise scope.
 *
 * This is the convergence bridge: the franchise app (peskids-franchise) has its
 * own canonical session adapter; the main app uses this helper to add
 * franchise-aware filtering to its admin routes.
 */

import { PESKIDS_TENANT_SLUG } from './franchise-constants';
import { supabaseServerUntypedSchema } from './supabase';
import { tenantRoleFromUserMetadata } from './runtime/tenant-identity';
import type { StaffAuthResult } from './staff-auth';

export type FranchiseScope = 'all' | string[];

/** Canonical service-role client (see lib/supabase.ts) — never construct one here. */
function serviceClient() {
  try {
    return supabaseServerUntypedSchema();
  } catch {
    return null;
  }
}

/**
 * Determine if a user role has global franchise visibility.
 */
function isGlobalFranchiseRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Resolve the franchise unit scope for a user.
 *
 * @param userId - The Supabase user ID
 * @param userRole - The user's role from app_metadata (owner, admin, support, teacher)
 * @returns 'all' for global roles, string[] of franchise IDs for scoped roles, or [] if no access
 */
export async function resolveFranchiseScope(
  userId: string,
  userRole: string | null | undefined
): Promise<FranchiseScope> {
  if (isGlobalFranchiseRole(userRole)) {
    return 'all';
  }

  const client = serviceClient();
  if (!client) return [];

  const { data, error } = await client
    .schema('platform')
    .from('peskids_franchise_staff_memberships')
    .select('franchise_id, role, active')
    .eq('tenant_slug', PESKIDS_TENANT_SLUG)
    .eq('user_id', userId)
    .eq('active', true);

  if (error || !data || data.length === 0) return [];

  const membershipRoles = data
    .map((m) => String(m.role ?? '').toLowerCase())
    .filter((r): r is 'support' | 'teacher' => r === 'support' || r === 'teacher');

  // Support users with memberships get scoped access
  if (membershipRoles.some((r) => r === 'support')) {
    return [...new Set(data.map((m) => String(m.franchise_id)))];
  }

  return [];
}

/**
 * Apply franchise scope to a Supabase query that has a franchise_id column.
 * If scope is 'all', no filter is applied. If scope is an array, filters to
 * those franchise IDs. If scope is empty, returns no results.
 */
export function applyFranchiseScope<T extends { franchise_id?: string | null }>(
  rows: T[],
  scope: FranchiseScope
): T[] {
  if (scope === 'all') return rows;
  if (scope.length === 0) return [];
  return rows.filter((row) => row.franchise_id && scope.includes(row.franchise_id));
}

/**
 * Check if a specific franchise_id is visible to the given scope.
 */
export function isFranchiseVisible(scope: FranchiseScope, franchiseId: string | null | undefined): boolean {
  if (scope === 'all') return true;
  if (!franchiseId) return false;
  return scope.includes(franchiseId);
}

/**
 * Franchise scope for a staff session.
 *
 * `method: 'secret'` is the shared DASHBOARD_ADMIN_SECRET (the tenant owner
 * credential), so it sees the whole network. Everything else is resolved from
 * the Supabase user's role plus their membership rows — never from anything the
 * client sent.
 */
export async function resolveStaffFranchiseScope(auth: StaffAuthResult): Promise<FranchiseScope> {
  if (!auth.ok) return [];
  if (auth.method === 'secret' && !auth.user) return 'all';
  if (!auth.user) return [];
  return resolveFranchiseScope(auth.user.id, tenantRoleFromUserMetadata(auth.user));
}

export type ResolvedFranchiseFilter =
  | { ok: true; franchiseId: string | null }
  | { ok: false; status: 403; reason: 'franchise_forbidden' }
  | { ok: false; status: 400; reason: 'franchise_required' };

/**
 * Decides which `franchise_id` a request may actually read, given the scope the
 * server derived for the session and whatever the client asked for.
 *
 * Pure so the rule is unit-testable in isolation:
 *  - global scope: honour the request (null means "the whole network")
 *  - no scope at all: refuse
 *  - scoped + explicit request: must be inside the scope, else 403
 *  - scoped + no request: fall back to the single franchise in scope; if there
 *    is more than one, require the caller to name one rather than silently
 *    widening to the whole network
 */
export function resolveFranchiseFilter(
  scope: FranchiseScope,
  requestedFranchiseId: string | null
): ResolvedFranchiseFilter {
  if (scope === 'all') {
    return { ok: true, franchiseId: requestedFranchiseId };
  }
  if (scope.length === 0) {
    return { ok: false, status: 403, reason: 'franchise_forbidden' };
  }
  if (requestedFranchiseId) {
    return scope.includes(requestedFranchiseId)
      ? { ok: true, franchiseId: requestedFranchiseId }
      : { ok: false, status: 403, reason: 'franchise_forbidden' };
  }
  if (scope.length === 1) {
    return { ok: true, franchiseId: scope[0] };
  }
  return { ok: false, status: 400, reason: 'franchise_required' };
}
