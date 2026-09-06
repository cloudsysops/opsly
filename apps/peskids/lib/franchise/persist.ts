import {
  FRANCHISE_SCHEMA_NOT_AVAILABLE,
  FranchisePersistenceError,
  createFranchiseService,
  createSupabaseFranchiseStore,
  type FranchiseActor,
} from '@intcloudsysops/franchise-persistence';
import { mapTenantStaffRole } from '@intcloudsysops/franchise-core';
import { NextResponse } from 'next/server';
import { PESKIDS_TENANT_SLUG } from '@/lib/franchise-constants';
import { supabaseServer, supabaseServerUntypedSchema } from '@/lib/supabase';
import { isPeskidsFranchiseOsEnabled } from '@/lib/peskids-pro-flags';
import type { StaffAuthResult } from '@/lib/staff-auth';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';

const FRANCHISE_OS_DISABLED = 'FRANCHISE_OS_DISABLED';

function assertFranchiseOsEnabled(): void {
  if (!isPeskidsFranchiseOsEnabled()) {
    throw new FranchisePersistenceError(
      FRANCHISE_OS_DISABLED,
      'Franchise OS is disabled in this environment',
      503
    );
  }
}

const NETWORK_ROLES = new Set(['platform_owner', 'tenant_owner', 'franchise_network_admin']);

/**
 * Maps a staff session onto a Franchise OS ACL role.
 *
 * Lives here (rather than in the deleted franchise-os.service) because it is the
 * only place the role is derived, and it must always be derived from the
 * *session* — never from anything the client sends.
 *
 * A `method === 'secret'` session is the shared DASHBOARD_ADMIN_SECRET, which is
 * the tenant owner credential, so it maps to `tenant_owner`.
 */
export function franchiseRoleFromAuth(auth: StaffAuthResult): FranchiseActor['role'] {
  if (auth.ok && auth.method === 'secret') return 'tenant_owner';
  if (auth.ok && auth.user) {
    return mapTenantStaffRole(tenantRoleFromUserMetadata(auth.user) ?? 'support');
  }
  return 'franchise_staff';
}

function platformClient() {
  return supabaseServerUntypedSchema().schema('platform');
}

export function getFranchiseService() {
  assertFranchiseOsEnabled();
  return createFranchiseService(createSupabaseFranchiseStore(supabaseServer()));
}

export async function resolveFranchiseActor(
  auth: StaffAuthResult,
  requestId: string
): Promise<FranchiseActor> {
  assertFranchiseOsEnabled();
  const store = createSupabaseFranchiseStore(supabaseServer());
  const tenantId = await store.resolveTenantId(PESKIDS_TENANT_SLUG);
  if (!tenantId) {
    throw new FranchisePersistenceError(
      FRANCHISE_SCHEMA_NOT_AVAILABLE,
      'Franchise OS schema is not applied in this environment',
      503
    );
  }
  const role = franchiseRoleFromAuth(auth);
  const actorId =
    auth.ok && auth.user?.id ? auth.user.id : auth.ok && auth.method === 'secret' ? 'dashboard-admin' : 'unknown';
  let assignedUnitIds: string[] = [];
  if (!NETWORK_ROLES.has(role) && auth.ok && auth.user?.id) {
    const { data, error } = await platformClient()
      .from('franchise_unit_members')
      .select('unit_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', auth.user.id)
      .eq('active', true);
    if (error && (error.code === '42P01' || /does not exist/i.test(error.message ?? ''))) {
      throw new FranchisePersistenceError(
        FRANCHISE_SCHEMA_NOT_AVAILABLE,
        'Franchise OS schema is not applied in this environment',
        503
      );
    }
    if (error) throw error;
    assignedUnitIds = ((data ?? []) as Array<{ unit_id: string }>).map((row) => row.unit_id);
  }
  return {
    tenantId,
    tenantSlug: PESKIDS_TENANT_SLUG,
    actorId,
    role,
    assignedUnitIds,
    requestId,
  };
}

export function franchiseErrorResponse(requestId: string, err: unknown): NextResponse {
  if (err instanceof FranchisePersistenceError) {
    return NextResponse.json(
      { ok: false, error: err.message, code: err.code, request_id: requestId },
      { status: err.status }
    );
  }
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : 'franchise persist failed';
  if (status === 403) {
    return NextResponse.json({ ok: false, error: message, request_id: requestId }, { status: 403 });
  }
  console.error('[franchise persist]', err, { request_id: requestId });
  return NextResponse.json(
    { ok: false, error: 'Failed to persist franchise data', request_id: requestId },
    { status: 500 }
  );
}
