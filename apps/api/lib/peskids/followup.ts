import { z } from 'zod';
import { getServiceClient } from '../supabase';
import { logger } from '../logger';

/** Shape of a follow-up log entry appended to each lead row. */
const followupLogEntrySchema = z.object({
  executed_at: z.string().datetime(),
  status: z.enum(['created', 'skipped', 'failed']),
  detail: z.string().optional(),
});

type FollowupLogEntry = z.infer<typeof followupLogEntrySchema>;

/** Returned by the pending endpoint. */
export type PendingFollowupLead = {
  id: string;
  lead_id: string | null;
  parent_name: string | null;
  child_name: string | null;
  email: string | null;
  phone: string | null;
  stage: string | null;
  created_at: string;
  hours_since_creation: number;
};

export type PendingFollowupsResponse = {
  tenant_slug: string;
  pending_followups: PendingFollowupLead[];
  count: number;
};

export type FollowupExecutionResult = {
  processed: number;
  failed: number;
  skipped: number;
  errors: { lead_id: string; error: string }[];
};

async function fetchPendingFollowupLeads(tenantSlug: string): Promise<PendingFollowupLead[]> {
  const db = getServiceClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .schema('platform')
    .from('peskids_leads')
    .select('id, lead_id, parent_name, child_name, email, phone, stage, created_at')
    .eq('tenant_slug', tenantSlug)
    .eq('stage', 'New Lead')
    .eq('followup_sent', false)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (error !== null) {
    logger.error('peskids.followup.query_error', {
      tenantSlug,
      error: error.message,
    });
    throw error;
  }

  const now = Date.now();
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const createdAt = String(row.created_at ?? now);
    return {
      id: String(row.id),
      lead_id: row.lead_id !== null ? String(row.lead_id) : null,
      parent_name: row.parent_name !== null ? String(row.parent_name) : null,
      child_name: row.child_name !== null ? String(row.child_name) : null,
      email: row.email !== null ? String(row.email) : null,
      phone: row.phone !== null ? String(row.phone) : null,
      stage: row.stage !== null ? String(row.stage) : null,
      created_at: createdAt,
      hours_since_creation: Math.round((now - new Date(createdAt).getTime()) / 3_600_000),
    };
  });
}

async function appendFollowupLogFallback(leadDbId: string, entry: FollowupLogEntry): Promise<void> {
  const db = getServiceClient();

  const { data: row } = await db
    .schema('platform')
    .from('peskids_leads')
    .select('followup_log')
    .eq('id', leadDbId)
    .single();

  const existing = (row as { followup_log?: unknown[] } | undefined)?.followup_log ?? [];
  const updated = [...(Array.isArray(existing) ? existing : []), entry];

  const { error } = await db
    .schema('platform')
    .from('peskids_leads')
    .update({
      followup_sent: true,
      followup_log: JSON.stringify(updated),
    })
    .eq('id', leadDbId);

  if (error !== null) {
    logger.error('peskids.followup.log_append_error', {
      leadDbId,
      error: error.message,
    });
  }
}

export async function getPendingFollowups(tenantSlug: string): Promise<PendingFollowupsResponse> {
  const leads = await fetchPendingFollowupLeads(tenantSlug);
  return {
    tenant_slug: tenantSlug,
    pending_followups: leads,
    count: leads.length,
  };
}

/**
 * Marks stale New Lead rows as followup-ready for staff / n8n.
 * External CRM task creation (legacy CRM) removed — Opsly uses Twenty + n8n.
 */
export async function executePendingFollowups(
  tenantSlug: string
): Promise<FollowupExecutionResult> {
  const leads = await fetchPendingFollowupLeads(tenantSlug);

  const result: FollowupExecutionResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const lead of leads) {
    try {
      const label = lead.parent_name
        ? `${lead.parent_name}${lead.child_name ? ` (${lead.child_name})` : ''}`
        : (lead.email ?? lead.id);

      await appendFollowupLogFallback(lead.id, {
        executed_at: new Date().toISOString(),
        status: 'created',
        detail: `Queued local follow-up for ${label}; sync via Twenty/n8n`,
      });
      result.processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed++;
      result.errors.push({ lead_id: lead.id, error: message });
      logger.warn('peskids.followup.mark_failed', {
        lead_id: lead.id,
        error: message,
      });
    }
  }

  logger.info('peskids.followup.execute_complete', {
    tenantSlug,
    processed: result.processed,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

export { followupLogEntrySchema };
export type { FollowupLogEntry };
