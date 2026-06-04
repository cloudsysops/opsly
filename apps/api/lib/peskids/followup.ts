import { z } from 'zod';
import { getServiceClient } from '../supabase';
import { logger } from '../logger';

/** Shape of a follow-up log entry appended to each lead row. */
const followupLogEntrySchema = z.object({
  executed_at: z.string().datetime(),
  ghl_task_id: z.string().optional(),
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

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

async function fetchPendingFollowupLeads(
  tenantSlug: string
): Promise<PendingFollowupLead[]> {
  const db = getServiceClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .schema('platform')
    .from('peskids_leads')
    .select(
      'id, lead_id, parent_name, child_name, email, phone, stage, created_at'
    )
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

// ---------------------------------------------------------------------------
// GHL task creation (direct HTTP — no @intcloudsysops/services dep in API)
// ---------------------------------------------------------------------------

function readGhlPeskidsEnv(): {
  apiKey: string;
  baseUrl: string;
} {
  const apiKey =
    process.env.GOHIGHLEVEL_PESKIDS_API_KEY?.trim() ??
    process.env.GOHIGHLEVEL_API_KEY?.trim() ??
    '';
  const baseUrl = (
    process.env.GOHIGHLEVEL_PESKIDS_API_URL?.trim() ??
    process.env.GOHIGHLEVEL_API_URL?.trim() ??
    'https://services.leadconnectorhq.com'
  ).replace(/\/$/, '');

  return { apiKey, baseUrl };
}

async function createGhlTask(lead: PendingFollowupLead): Promise<{
  ok: true; taskId: string
} | {
  ok: false; error: string
}> {
  const { apiKey, baseUrl } = readGhlPeskidsEnv();

  if (!apiKey) {
    return { ok: false, error: 'GHL API key not configured' };
  }

  const title = lead.parent_name && lead.child_name
    ? `Follow-up needed: ${lead.parent_name} (${lead.child_name})`
    : lead.parent_name
      ? `Follow-up needed: ${lead.parent_name}`
      : 'Follow-up needed (Peskids lead)';

  try {
    const response = await fetch(`${baseUrl}/v1/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title,
        contactId: lead.lead_id ?? undefined,
        dueDate: new Date().toISOString().slice(0, 10),
        status: 'pending',
        priority: 'high',
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, error: `GHL API returned ${response.status}: ${text.slice(0, 200)}` };
    }

    const body = (await response.json()) as { data?: { id?: string } };
    const taskId = body.data?.id ?? 'unknown';
    return { ok: true, taskId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Append to followup_log JSONB column
// ---------------------------------------------------------------------------

async function appendFollowupLog(
  leadDbId: string,
  entry: FollowupLogEntry
): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .schema('platform')
    .from('peskids_leads')
    .update({
      followup_sent: true,
      followup_log: db.rpc('jsonb_append' as never, {
        target: null,
        value: JSON.stringify([entry]),
      } as never),
    } as never)
    .eq('id', leadDbId);

  // JSONB upserts are tricky via PostgREST — fallback to read + write
  if (error !== null && error.message?.includes('rpc')) {
    await appendFollowupLogFallback(leadDbId, entry);
  }
}

async function appendFollowupLogFallback(
  leadDbId: string,
  entry: FollowupLogEntry
): Promise<void> {
  const db = getServiceClient();

  const { data: row } = await db
    .schema('platform')
    .from('peskids_leads')
    .select('followup_log')
    .eq('id', leadDbId)
    .single();

  const existing = (
    row as { followup_log?: unknown[] } | undefined
  )?.followup_log ?? [];
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getPendingFollowups(
  tenantSlug: string
): Promise<PendingFollowupsResponse> {
  const leads = await fetchPendingFollowupLeads(tenantSlug);
  return {
    tenant_slug: tenantSlug,
    pending_followups: leads,
    count: leads.length,
  };
}

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
    if (!lead.lead_id) {
      // No GHL contact linked — skip but mark as processed to avoid re-polling
      await appendFollowupLogFallback(lead.id, {
        executed_at: new Date().toISOString(),
        status: 'skipped',
        detail: 'No lead_id (GHL contact ID) available',
      });
      result.skipped++;
      continue;
    }

    const task = await createGhlTask(lead);

    if (!task.ok) {
      result.failed++;
      result.errors.push({ lead_id: lead.id, error: task.error });
      // Log the failure but do NOT mark followup_sent — allow retry
      // Only log if we can't even read
      logger.warn('peskids.followup.task_failed', {
        lead_id: lead.id,
        error: task.error,
      });
      continue;
    }

    await appendFollowupLogFallback(lead.id, {
      executed_at: new Date().toISOString(),
      ghl_task_id: task.taskId,
      status: 'created',
    });

    result.processed++;
  }

  logger.info('peskids.followup.execute_complete', {
    tenantSlug,
    processed: result.processed,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

// Re-export for convenience
export { followupLogEntrySchema };
export type { FollowupLogEntry };
