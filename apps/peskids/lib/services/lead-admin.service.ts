import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import {
  isMissingPlatformPeskidsTable,
  mapPlatformLeadRow,
  type PlatformPeskidsLeadRow,
} from '@/lib/peskids-platform-read';
import type { DashboardData } from '@/lib/types';
import type { AdminLeadStatus } from '@/lib/validation/lead-admin.schema';
import { syncLeadStageToTwenty } from '@/lib/twenty-stage-sync';
import { emitLeadStatusTransition } from '@/lib/events';

export type DashboardLead = DashboardData['new_leads'][number];

export type UpdateLeadAdminInput = {
  status?: AdminLeadStatus;
  admin_notes?: string;
};

function platformFrom() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

export function mapAdminStatusToPlatform(status: AdminLeadStatus): string {
  switch (status) {
    case 'new':
      return 'new';
    case 'contacted':
      return 'contacted';
    case 'trial':
      return 'qualified';
    case 'enrolled':
      return 'converted';
    case 'archived':
      return 'lost';
    default:
      return 'new';
  }
}

function mapLegacyLeadRow(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  class_modality: DashboardLead['class_modality'];
  neighborhood: string | null;
  grade_interested: string;
  status: DashboardLead['status'];
  admin_notes: string | null;
  referral_code: string | null;
  referred_by_code: string | null;
  referral_discount_cents: number;
  referral_redemptions: number;
  referral_source: string | null;
  created_at?: string;
  franchise_id?: string | null;
}): DashboardLead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    class_modality: row.class_modality,
    neighborhood: row.neighborhood,
    grade_interested: row.grade_interested,
    status: row.status,
    admin_notes: row.admin_notes,
    referral_code: row.referral_code,
    referred_by_code: row.referred_by_code,
    referral_discount_cents: row.referral_discount_cents,
    referral_redemptions: row.referral_redemptions,
    referral_source: row.referral_source,
    created_at: row.created_at ?? new Date().toISOString(),
    franchise_id: row.franchise_id ?? null,
    twenty_person_id: null,
    twenty_opportunity_id: null,
    twenty_person_url: null,
    twenty_opportunity_url: null,
    twenty_sync_status: 'pending',
  };
}

async function updatePlatformLead(
  leadId: string,
  tenantSlug: string,
  input: UpdateLeadAdminInput
): Promise<DashboardLead | null> {
  const patch: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) {
    patch.status = mapAdminStatusToPlatform(input.status);
  }
  if (input.admin_notes !== undefined) {
    patch.admin_notes = input.admin_notes;
  }

  const { data, error } = await platformFrom()
    .update(patch)
    .eq('id', leadId)
    .eq('tenant_slug', tenantSlug)
    .select(
      'id, full_name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes, referral_source, created_at, twenty_person_id, twenty_opportunity_id'
    )
    .maybeSingle();

  if (error) {
    if (isMissingPlatformPeskidsTable(error)) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPlatformLeadRow(data as PlatformPeskidsLeadRow);
}

async function updateLegacyLead(
  leadId: string,
  tenantSlug: string,
  input: UpdateLeadAdminInput
): Promise<DashboardLead | null> {
  const supabase = supabaseServer();
  const patch: Database['public']['Tables']['leads']['Update'] = {};

  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.admin_notes !== undefined) {
    patch.admin_notes = input.admin_notes;
  }

  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', leadId)
    .eq('tenant_id', tenantSlug)
    .select(
      'id, name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes, referral_code, referred_by_code, referral_discount_cents, referral_redemptions, referral_source'
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapLegacyLeadRow(
    data as Parameters<typeof mapLegacyLeadRow>[0]
  );
}

async function fetchPlatformLead(
  leadId: string,
  tenantSlug: string
): Promise<DashboardLead | null> {
  const { data, error } = await platformFrom()
    .select(
      'id, full_name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes, referral_source, created_at, twenty_person_id, twenty_opportunity_id'
    )
    .eq('id', leadId)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle();

  if (error) {
    if (isMissingPlatformPeskidsTable(error)) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPlatformLeadRow(data as PlatformPeskidsLeadRow);
}

async function fetchLegacyLead(
  leadId: string,
  tenantSlug: string
): Promise<DashboardLead | null> {
  const { data, error } = await supabaseServer()
    .from('leads')
    .select(
      'id, name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes, referral_code, referred_by_code, referral_discount_cents, referral_redemptions, referral_source, created_at'
    )
    .eq('id', leadId)
    .eq('tenant_id', tenantSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapLegacyLeadRow(data as Parameters<typeof mapLegacyLeadRow>[0]);
}

export async function getLeadForAdmin(
  leadId: string,
  tenantSlug: string
): Promise<DashboardLead | null> {
  const platformLead = await fetchPlatformLead(leadId, tenantSlug);
  if (platformLead) {
    return platformLead;
  }

  return fetchLegacyLead(leadId, tenantSlug);
}

export async function updateLeadForAdmin(
  leadId: string,
  tenantSlug: string,
  input: UpdateLeadAdminInput
): Promise<DashboardLead | null> {
  const previous =
    input.status !== undefined ? await getLeadForAdmin(leadId, tenantSlug) : null;
  const fromStatus = previous?.status ?? null;

  const platformLead = await updatePlatformLead(leadId, tenantSlug, input);
  const updated = platformLead ?? (await updateLegacyLead(leadId, tenantSlug, input));

  if (!updated) {
    return null;
  }

  if (platformLead && input.status !== undefined) {
    // Never block admin status updates on Twenty outages.
    void syncLeadStageToTwenty({
      leadId,
      tenantSlug,
      adminStatus: input.status,
      twentyOpportunityId: platformLead.twenty_opportunity_id,
    }).catch((error: unknown) => {
      console.warn('[lead-admin] twenty stage sync failed', {
        lead_id: leadId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  if (input.status !== undefined) {
    void emitLeadStatusTransition({
      leadId,
      fromStatus,
      toStatus: input.status,
    }).catch((error: unknown) => {
      console.warn('[lead-admin] status event emit failed', {
        lead_id: leadId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return updated;
}
