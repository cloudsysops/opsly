import { getServiceClient } from './supabase';
import { logger } from './logger';
import type { Json } from './supabase/types';

export async function fetchTenantMetadataBySlug(slug: string): Promise<Json | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .select('metadata')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error !== null) {
    logger.error('tenant_metadata_fetch', { slug, error });
    return null;
  }
  if (data === null) {
    return null;
  }
  return (data as { metadata: Json | null }).metadata;
}
