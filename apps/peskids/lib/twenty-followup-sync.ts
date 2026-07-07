import { TwentyClient, resolveTwentyEnv, type TwentyTaskStatus } from '@intcloudsysops/services/twenty';
import { supabaseServer } from '@/lib/supabase';

/**
 * One-way sync: staff work entirely from the Peskids followups CRUD, never
 * opening Twenty directly. Lead-linked followups also get a Twenty Task
 * (+ TaskTarget) so the commercial pipeline stays complete for reporting.
 * Every call here is best-effort — a Twenty failure must never block the
 * Peskids-side operation, so every function swallows its own errors.
 */

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
  leadId: string;
  type: string;
  dueDate: string;
  notes: string | null;
}): Promise<string | null> {
  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) return null;

    const { personId, opportunityId } = await twentyIdsForLead(input.leadId);
    if (!personId && !opportunityId) return null;

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

    return task.id;
  } catch (err) {
    console.warn('[twenty-followup-sync] Failed to create Twenty task:', err);
    return null;
  }
}

export async function syncTwentyTaskStatus(
  twentyTaskId: string,
  followupStatus: 'pending' | 'completed' | 'cancelled'
): Promise<void> {
  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) return;

    const client = new TwentyClient(env.apiKey, env.baseUrl);
    await client.updateTask(twentyTaskId, {
      status: TWENTY_TASK_STATUS_BY_FOLLOWUP_STATUS[followupStatus],
    });
  } catch (err) {
    console.warn('[twenty-followup-sync] Failed to update Twenty task:', err);
  }
}
