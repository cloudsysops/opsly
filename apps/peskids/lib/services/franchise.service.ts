import { supabaseServer } from '@/lib/supabase';
import {
  FRANCHISE_SLUGS,
  PESKIDS_TENANT_SLUG,
  franchiseSlugFromModality,
  type FranchiseStatus,
  type FranchiseType,
  type SwimModalityOrLocation,
} from '@/lib/franchise-constants';
import type { FranchiseIdBySlug } from '@/lib/franchise-resolve';

export type PeskidsFranchise = {
  id: string;
  tenant_slug: string;
  slug: string;
  name: string;
  type: FranchiseType;
  status: FranchiseStatus;
  parent_franchise_id: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

function platformClient() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform');
}

export async function listPeskidsFranchises(options?: {
  status?: FranchiseStatus;
}): Promise<PeskidsFranchise[]> {
  let query = platformClient()
    .from('peskids_franchises')
    .select(
      'id, tenant_slug, slug, name, type, status, parent_franchise_id, is_primary, created_at, updated_at'
    )
    .eq('tenant_slug', PESKIDS_TENANT_SLUG)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PeskidsFranchise[];
}

export async function getPrimaryFranchise(): Promise<PeskidsFranchise | null> {
  const { data, error } = await platformClient()
    .from('peskids_franchises')
    .select(
      'id, tenant_slug, slug, name, type, status, parent_franchise_id, is_primary, created_at, updated_at'
    )
    .eq('tenant_slug', PESKIDS_TENANT_SLUG)
    .eq('is_primary', true)
    .maybeSingle();

  if (error) throw error;
  return (data as PeskidsFranchise | null) ?? null;
}

export async function getFranchiseIdMap(): Promise<FranchiseIdBySlug | null> {
  const franchises = await listPeskidsFranchises({ status: 'active' });
  const llano = franchises.find((f) => f.slug === FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL);
  const domicilio = franchises.find((f) => f.slug === FRANCHISE_SLUGS.DOMICILIOS_PESKIDS);
  if (!llano || !domicilio) {
    return null;
  }
  return {
    [FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL]: llano.id,
    [FRANCHISE_SLUGS.DOMICILIOS_PESKIDS]: domicilio.id,
  };
}

export async function resolveFranchiseIdFromModality(
  modality: SwimModalityOrLocation
): Promise<string | null> {
  const map = await getFranchiseIdMap();
  if (!map) return null;
  return map[franchiseSlugFromModality(modality)];
}
