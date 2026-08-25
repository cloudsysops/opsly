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

import { createClient } from '@supabase/supabase-js';
import { PESKIDS_TENANT_SLUG, type FranchiseRole } from './franchise-constants';

export type FranchiseScope = 'all' | string[];

type FranchiseMembershipRow = {
  user_id: string;
  franchise_id: string;
  role: string;
  active: boolean;
  tenant_slug: string;
};

function serviceClient() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
    .map((m: FranchiseMembershipRow) => m.role?.toLowerCase())
    .filter((r): r is FranchiseRole => r === 'support' || r === 'teacher');

  // Support users with memberships get scoped access
  if (membershipRoles.some((r) => r === 'support')) {
    return [...new Set(data.map((m: FranchiseMembershipRow) => m.franchise_id))];
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
