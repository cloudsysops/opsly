import { TwentyClient, resolveTwentyEnv } from '@intcloudsysops/services';
import {
  adminLeadStatusToPro,
  proLeadStatusToTwentyStageSlug,
  type AdminLeadStatusLive,
  type TwentyOpportunityStageSlug,
} from '@/lib/domain/peskids-pro-mappers';
import { supabaseServer } from '@/lib/supabase';

export type LeadStageSyncInput = {
  leadId: string;
  tenantSlug: string;
  adminStatus: AdminLeadStatusLive;
  twentyOpportunityId: string | null | undefined;
};

export type LeadStageSyncResult = {
  ok: boolean;
  status: 'synced' | 'skipped' | 'failed';
  detail: string;
  stage?: TwentyOpportunityStageSlug;
};

function platformFrom() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

async function persistSyncState(input: {
  leadId: string;
  tenantSlug: string;
  status: 'pending' | 'synced' | 'failed' | 'retrying' | 'skipped';
  error?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const patch: Record<string, string | null> = {
    twenty_sync_status: input.status,
    twenty_sync_error: input.error ?? null,
    updated_at: now,
  };
  if (input.status === 'synced') {
    patch.twenty_synced_at = now;
  }

  const { error } = await platformFrom()
    .update(patch)
    .eq('id', input.leadId)
    .eq('tenant_slug', input.tenantSlug);

  if (error) {
    console.warn('[twenty-stage-sync] failed to persist sync state', {
      lead_id: input.leadId,
      error: error.message,
    });
  }
}

export function resolveTwentyStageForAdminStatus(
  adminStatus: AdminLeadStatusLive
): TwentyOpportunityStageSlug {
  return proLeadStatusToTwentyStageSlug(adminLeadStatusToPro(adminStatus));
}

/**
 * Best-effort Twenty opportunity stage update. Never throws to callers —
 * admin lead PATCH must stay available when CRM is down.
 */
export async function syncLeadStageToTwenty(
  input: LeadStageSyncInput
): Promise<LeadStageSyncResult> {
  const env = resolveTwentyEnv();
  if (!env.enabled) {
    return {
      ok: true,
      status: 'skipped',
      detail: 'Twenty not enabled',
    };
  }

  const opportunityId = input.twentyOpportunityId?.trim();
  if (!opportunityId) {
    await persistSyncState({
      leadId: input.leadId,
      tenantSlug: input.tenantSlug,
      status: 'skipped',
      error: 'missing twenty_opportunity_id',
    });
    return {
      ok: true,
      status: 'skipped',
      detail: 'missing twenty_opportunity_id',
    };
  }

  const stage = resolveTwentyStageForAdminStatus(input.adminStatus);

  try {
    const client = new TwentyClient(env.apiKey, env.baseUrl);
    await client.updateOpportunity(opportunityId, { stage });
    await persistSyncState({
      leadId: input.leadId,
      tenantSlug: input.tenantSlug,
      status: 'synced',
      error: null,
    });
    console.info(
      JSON.stringify({
        component: 'peskids.twenty_stage_sync',
        lead_id: input.leadId,
        opportunity_id: opportunityId,
        stage,
        status: 'synced',
      })
    );
    return {
      ok: true,
      status: 'synced',
      detail: 'opportunity stage updated',
      stage,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await persistSyncState({
      leadId: input.leadId,
      tenantSlug: input.tenantSlug,
      status: 'failed',
      error: detail.slice(0, 500),
    });
    console.warn('[twenty-stage-sync] stage update failed', {
      lead_id: input.leadId,
      opportunity_id: opportunityId,
      stage,
      error: detail,
    });
    return {
      ok: false,
      status: 'failed',
      detail,
      stage,
    };
  }
}
