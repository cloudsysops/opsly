import { TwentyClient, resolveTwentyEnv, type TwentyTaskStatus } from '@intcloudsysops/services/twenty';
import { supabaseServer } from '@/lib/supabase';

/**
 * One-way sync: staff work entirely from the Peskids followups CRUD, never
 * opening Twenty directly. Lead-linked followups also get a Twenty Task
 * (+ TaskTarget) so the commercial pipeline stays complete for reporting.
 * Every call here is best-effort — a Twenty failure must never block the
 * Peskids-side operation, so every function swallows its own errors.
 */

export type FollowupSyncStatus = 'pending' | 'synced' | 'failed' | 'retrying' | 'skipped';

function platformClient() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

async function twentyIdsForLead(
  leadId: string
): Promise<{ personId: string | null; opportunityId: string | null }> {
  const { data, error } = await platformClient()
    .select('twenty_person_id, twenty_opportunity_id')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !data) {
    return { personId: null, opportunityId: null };
  }

  const row = data as { twenty_person_id: string | null; twenty_opportunity_id: string | null };
  return { personId: row.twenty_person_id, opportunityId: row.twenty_opportunity_id };
}

async function persistFollowupSyncState(input: {
  followupId: string;
  status: FollowupSyncStatus;
  error?: string | null;
  twentyTaskId?: string | null;
  incrementRetry?: boolean;
}): Promise<void> {
  const patch: Record<string, string | number | null> = {
    sync_status: input.status,
    sync_error: input.error ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.twentyTaskId !== undefined) {
    patch.twenty_task_id = input.twentyTaskId;
  }

  try {
    if (input.incrementRetry) {
      const { data } = await supabaseServer()
        .from('followups')
        .select('retry_count')
        .eq('id', input.followupId)
        .maybeSingle();
      const current =
        data && typeof (data as { retry_count?: number }).retry_count === 'number'
          ? (data as { retry_count: number }).retry_count
          : 0;
      patch.retry_count = current + 1;
    } else if (input.status === 'synced') {
      patch.retry_count = 0;
    }

    const { error } = await supabaseServer()
      .from('followups')
      .update(patch)
      .eq('id', input.followupId);

    if (error) {
      console.warn('[twenty-followup-sync] failed to persist sync state', {
        followup_id: input.followupId,
        error: error.message,
      });
    }
  } catch (err) {
    console.warn('[twenty-followup-sync] persist sync state threw', err);
  }
}

// Twenty has no "cancelled" task status — closest safe mapping until verified
// against a real Twenty instance (see TwentyTaskStatus doc comment).
const TWENTY_TASK_STATUS_BY_FOLLOWUP_STATUS: Record<
  'pending' | 'completed' | 'cancelled',
  TwentyTaskStatus
> = {
  pending: 'TODO',
  completed: 'DONE',
  cancelled: 'DONE',
};

export async function createTwentyTaskForLeadFollowup(input: {
  followupId: string;
  leadId: string;
  type: string;
  dueDate: string;
  notes: string | null;
}): Promise<string | null> {
  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) {
      await persistFollowupSyncState({
        followupId: input.followupId,
        status: 'skipped',
        error: 'Twenty not enabled',
      });
      return null;
    }

    const { personId, opportunityId } = await twentyIdsForLead(input.leadId);
    if (!personId && !opportunityId) {
      await persistFollowupSyncState({
        followupId: input.followupId,
        status: 'skipped',
        error: 'lead has no Twenty ids',
      });
      return null;
    }

    const client = new TwentyClient(env.apiKey, env.baseUrl);
    const task = await client.createTask({
      title: `Seguimiento (${input.type}) — Peskids`,
      body: input.notes ?? undefined,
      dueAt: new Date(input.dueDate).toISOString(),
      status: 'TODO',
    });

    await client.createTaskTarget({
      taskId: task.id,
      ...(personId ? { personId } : {}),
      ...(opportunityId ? { opportunityId } : {}),
    });

    await persistFollowupSyncState({
      followupId: input.followupId,
      status: 'synced',
      error: null,
      twentyTaskId: task.id,
    });

    return task.id;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn('[twenty-followup-sync] Failed to create Twenty task:', err);
    await persistFollowupSyncState({
      followupId: input.followupId,
      status: 'failed',
      error: detail.slice(0, 500),
      incrementRetry: true,
    });
    return null;
  }
}

export async function syncTwentyTaskStatus(
  followupId: string,
  twentyTaskId: string,
  followupStatus: 'pending' | 'completed' | 'cancelled'
): Promise<void> {
  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) {
      await persistFollowupSyncState({
        followupId,
        status: 'skipped',
        error: 'Twenty not enabled',
      });
      return;
    }

    const client = new TwentyClient(env.apiKey, env.baseUrl);
    await client.updateTask(twentyTaskId, {
      status: TWENTY_TASK_STATUS_BY_FOLLOWUP_STATUS[followupStatus],
    });
    await persistFollowupSyncState({
      followupId,
      status: 'synced',
      error: null,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn('[twenty-followup-sync] Failed to update Twenty task:', err);
    await persistFollowupSyncState({
      followupId,
      status: 'failed',
      error: detail.slice(0, 500),
      incrementRetry: true,
    });
  }
}
