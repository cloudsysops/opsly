import type { StaffAuthResult } from '@/lib/staff-auth';
import {
  isFranchiseVisible,
  resolveFranchiseScope,
  type FranchiseScope,
} from '@/lib/franchise-scope';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { resolvePeskidsEnvironment } from '@/lib/runtime-environment';

export type DashboardFranchiseAuth =
  | { ok: true; franchiseId: string | null }
  | { ok: false; status: number; error: string };

function secretScopeAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (resolvePeskidsEnvironment(env) !== 'production') return true;
  return env.PESKIDS_ALLOW_DASHBOARD_ADMIN_SECRET?.trim() === '1';
}

export async function authorizeDashboardFranchiseFilter(
  auth: Extract<StaffAuthResult, { ok: true }>,
  requestedFranchiseId: string | null
): Promise<DashboardFranchiseAuth> {
  let scope: FranchiseScope = [];

  if (auth.method === 'secret') {
    if (!secretScopeAllowed()) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    scope = 'all';
  } else if (auth.user?.id) {
    scope = await resolveFranchiseScope(auth.user.id, tenantRoleFromUserMetadata(auth.user));
  }

  if (requestedFranchiseId && !isFranchiseVisible(scope, requestedFranchiseId)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  if (requestedFranchiseId) {
    return { ok: true, franchiseId: requestedFranchiseId };
  }

  if (scope === 'all') {
    return { ok: true, franchiseId: null };
  }

  if (scope.length === 1) {
    return { ok: true, franchiseId: scope[0] };
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}
