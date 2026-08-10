import { getServiceClient } from '../supabase';
import { logger } from '../logger';
import type { PeskidsPipelineStage } from './pipeline-contract';

export type UpdateLeadStageResult =
  | { ok: true; lead: LeadRow }
  | { ok: false; error: string; code?: 'NOT_FOUND' | 'NO_CHANGE' };

type LeadRow = {
  id: string;
  tenant_slug: string;
  lead_id: string | null;
  source: string | null;
  stage: string | null;
};

const LEAD_SELECT = [
  'id',
  'tenant_slug',
  'lead_id',
  'source',
  'stage',
  'created_at',
  'updated_at',
].join(', ');

/**
 * Update local sales stage in Supabase. CRM stage sync is Twenty/n8n only —
 * legacy CRM dual-write removed.
 */
export async function updateLeadStage(
  tenantSlug: string,
  leadId: string,
  newStage: PeskidsPipelineStage
): Promise<UpdateLeadStageResult> {
  const db = getServiceClient();

  const { data: existing, error: fetchError } = await db
    .schema('platform')
    .from('peskids_leads')
    .select(LEAD_SELECT)
    .eq('id', leadId)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle();

  if (fetchError !== null) {
    logger.error('peskids.sales-pipeline.fetch_error', {
      tenantSlug,
      leadId,
      error: fetchError.message,
    });
    return { ok: false, error: `database error: ${fetchError.message}` };
  }

  if (existing === null) {
    return { ok: false, error: 'lead not found', code: 'NOT_FOUND' };
  }

  const row = existing as unknown as LeadRow;

  if (row.stage === newStage) {
    return { ok: false, error: 'stage unchanged', code: 'NO_CHANGE' };
  }

  const { data: updated, error: updateError } = await db
    .schema('platform')
    .from('peskids_leads')
    .update({ stage: newStage, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select(LEAD_SELECT)
    .maybeSingle();

  if (updateError !== null || updated === null) {
    logger.error('peskids.sales-pipeline.update_error', {
      tenantSlug,
      leadId,
      stage: newStage,
      error: updateError?.message ?? 'update returned no row',
    });
    return { ok: false, error: updateError?.message ?? 'update failed' };
  }

  return { ok: true, lead: updated as unknown as LeadRow };
}
