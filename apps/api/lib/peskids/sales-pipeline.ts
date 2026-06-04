import { getServiceClient } from '../supabase';
import { logger } from '../logger';
import type { PeskidsPipelineStage } from './ghl-contract';
import { getGoHighLevelService } from '@intcloudsysops/services/gohighlevel';

export const PESKIDS_TO_GHL_STAGE: Record<PeskidsPipelineStage, string | undefined> = {
  'New Lead': '1',
  Contacted: '2',
  'Trial Class': '3',
  Enrolled: '4',
  'Active Student': undefined,
  Renewal: undefined,
  Lost: '5',
};

export type UpdateLeadStageResult =
  | { ok: true; lead: LeadRow; error?: string; code?: 'GHL_FAILED' }
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

  const updatedRow = updated as unknown as LeadRow;

  const ghlLeadId = updatedRow.lead_id ?? row.lead_id;
  const ghlStageId = ghlLeadId ? PESKIDS_TO_GHL_STAGE[newStage] : undefined;

  if (ghlLeadId && ghlStageId) {
    try {
      const service = getGoHighLevelService();
      await service.updateOpportunityStage('peskids', ghlLeadId, ghlStageId);
      logger.info('peskids.sales-pipeline.ghl_sync_ok', {
        tenantSlug,
        leadId,
        ghlLeadId,
        ghlStageId,
        stage: newStage,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('peskids.sales-pipeline.ghl_sync_failed', {
        tenantSlug,
        leadId,
        ghlLeadId,
        stage: newStage,
        error: msg,
      });
      return {
        ok: true,
        lead: updatedRow,
        error: `stage updated locally, GHL sync failed: ${msg}`,
        code: 'GHL_FAILED' as const,
      };
    }
  } else if (ghlLeadId && !ghlStageId) {
    logger.info('peskids.sales-pipeline.ghl_skipped_no_mapping', {
      tenantSlug,
      leadId,
      stage: newStage,
      ghlLeadId,
    });
  }

  return { ok: true, lead: updatedRow };
}
