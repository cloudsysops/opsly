import { supabaseServer } from '@/lib/supabase';
import { ENROLLMENT_TOKEN_TENANT } from './token';
import { asLeadMetadata } from './metadata';
import type { EnrollmentLeadRecord } from './types';

export type EnrollmentLeadStore = {
  getById(leadId: string, tenantSlug: string): Promise<EnrollmentLeadRecord | null>;
  findByTokenHash(tokenHash: string, tenantSlug: string): Promise<EnrollmentLeadRecord | null>;
  saveMetadata(
    leadId: string,
    tenantSlug: string,
    metadata: EnrollmentLeadRecord['metadata']
  ): Promise<void>;
};

function mapRow(row: {
  id: string;
  tenant_slug?: string | null;
  status?: string | null;
  metadata?: unknown;
  referral_source?: string | null;
  created_at?: string | null;
}): EnrollmentLeadRecord {
  return {
    id: row.id,
    tenant_slug: row.tenant_slug ?? ENROLLMENT_TOKEN_TENANT,
    status: row.status ?? 'new',
    metadata: asLeadMetadata(row.metadata),
    referral_source: row.referral_source ?? null,
    created_at: row.created_at ?? null,
  };
}

function platformLeads() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

export const supabaseEnrollmentLeadStore: EnrollmentLeadStore = {
  async getById(leadId, tenantSlug) {
    const { data, error } = await platformLeads()
      .select('id, tenant_slug, status, metadata, referral_source, created_at')
      .eq('id', leadId)
      .eq('tenant_slug', tenantSlug)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return mapRow(data as Parameters<typeof mapRow>[0]);
  },

  async findByTokenHash(tokenHash, tenantSlug) {
    const { data, error } = await platformLeads()
      .select('id, tenant_slug, status, metadata, referral_source, created_at')
      .eq('tenant_slug', tenantSlug)
      .filter('metadata->enrollment_access->>token_hash', 'eq', tokenHash)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return mapRow(data as Parameters<typeof mapRow>[0]);
  },

  async saveMetadata(leadId, tenantSlug, metadata) {
    const { error } = await platformLeads()
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('tenant_slug', tenantSlug);
    if (error) {
      throw error;
    }
  },
};
