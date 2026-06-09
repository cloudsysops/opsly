import { getServiceClient } from '../supabase';
import { logger } from '../logger';
import type { PeskidsPipelineStage } from './ghl-contract';
import { getGoHighLevelService } from '@intcloudsysops/services/gohighlevel';

/**
 * GHL "Peskids Enrollment" pipeline — real stage IDs.
 * Pipeline ID: bWKAQuLTQUjeGAvgf9fX (location: KJ5LawrOOe3hIerqtMRu)
 * Fetched: 2026-06-04 via GET /opportunities/pipelines
 * Refresh: run scripts/ghl-peskids-operator-run.ts (Doppler prd) to verify.
 */
export const PESKIDS_GHL_PIPELINE_ID = 'bWKAQuLTQUjeGAvgf9fX';

export const PESKIDS_TO_GHL_STAGE: Record<PeskidsPipelineStage, string> = {
  'New Lead': 'f4c7365b-efe8-4d33-9559-c7f06881f172',
  Contacted: '75742c84-9063-4539-b755-b09bfdeb6346',
  'Trial Class': '13f095d8-4c87-4637-a6f7-b8d2d294ad0b',
  Enrolled: 'd69d8656-1836-4d48-8a83-5268895c5c74',
  'Active Student': 'c9b615f7-b4da-416c-a3b1-28be6da1d063',
  Renewal: 'e9c02a74-f298-48a4-a1e5-1c952f950531',
  Lost: '6faadc43-3454-4a0a-af6f-6ee7c4ecbad7',
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
  const ghlStageId = PESKIDS_TO_GHL_STAGE[newStage];

  if (ghlLeadId) {
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
  }

  return { ok: true, lead: updatedRow };
}
