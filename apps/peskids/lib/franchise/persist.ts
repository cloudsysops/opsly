import {
  FRANCHISE_SCHEMA_NOT_AVAILABLE,
  FranchisePersistenceError,
  createFranchiseService,
  createSupabaseFranchiseStore,
  type FranchiseActor,
} from '@intcloudsysops/franchise-persistence';
import { NextResponse } from 'next/server';
import { PESKIDS_TENANT_SLUG } from '@/lib/franchise-constants';
import { supabaseServer } from '@/lib/supabase';
import type { StaffAuthResult } from '@/lib/staff-auth';
import { franchiseRoleFromAuth } from '@/lib/services/franchise-os.service';

const NETWORK_ROLES = new Set(['platform_owner', 'tenant_owner', 'franchise_network_admin']);

function platformClient() {
  return (supabaseServer() as unknown as {
    schema: (name: string) => {
      from: (table: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  }).schema('platform');
}

export function getFranchiseService() {
  return createFranchiseService(createSupabaseFranchiseStore(supabaseServer()));
}

export async function resolveFranchiseActor(
  auth: StaffAuthResult,
  requestId: string
): Promise<FranchiseActor> {
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
      .from('peskids_franchise_staff_memberships')
      .select('franchise_id')
      .eq('tenant_slug', PESKIDS_TENANT_SLUG)
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
    assignedUnitIds = ((data ?? []) as Array<{ franchise_id: string }>).map(
      (row) => `peskids:${row.franchise_id}`
    );
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
