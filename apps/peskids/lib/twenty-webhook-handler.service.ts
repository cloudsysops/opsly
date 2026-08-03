import { supabaseServer } from '@/lib/supabase';
import {
  twentyStageSlugToAdminLeadStatusLive,
  type TwentyOpportunityStageSlug,
} from '@/lib/domain/peskids-pro-mappers';

/**
 * Handles inbound Twenty CRM webhook events (Twenty -> Opsly), completing
 * the loop that twenty-stage-sync.ts / twenty-followup-sync.ts only push
 * one way (Opsly -> Twenty). A staff member moving an Opportunity's stage
 * or completing a Task directly inside Twenty now reflects back here.
 *
 * Twenty's exact webhook payload shape needs live verification (see
 * webhook-verify.ts's doc comment) — parseEvent() is deliberately
 * defensive: an unrecognized shape safely no-ops rather than throws, since
 * a webhook handler must never 500 on a payload shape it wasn't built for.
 */

export type TwentyWebhookHandlerResult = { handled: boolean; detail: string };

function platformLeadsFrom() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

const VALID_STAGES: ReadonlySet<TwentyOpportunityStageSlug> = new Set([
  'NEW',
  'CONTACTED',
  'TRIAL_SCHEDULED',
  'TRIAL_COMPLETED',
  'ENROLLED',
  'LOST',
]);

function isValidStage(value: unknown): value is TwentyOpportunityStageSlug {
  return typeof value === 'string' && VALID_STAGES.has(value as TwentyOpportunityStageSlug);
}

type ParsedTwentyEvent = { eventType: string; record: Record<string, unknown> };

function parseEvent(payload: unknown): ParsedTwentyEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;

  const eventType =
    typeof obj.eventType === 'string'
      ? obj.eventType
      : typeof obj.type === 'string'
        ? obj.type
        : null;
  if (!eventType) return null;

  const record = obj.record ?? obj.data ?? obj.object;
  if (!record || typeof record !== 'object') return null;

  return { eventType, record: record as Record<string, unknown> };
}

async function handleOpportunityEvent(
  record: Record<string, unknown>
): Promise<TwentyWebhookHandlerResult> {
  const opportunityId = typeof record.id === 'string' ? record.id : null;
  if (!opportunityId) {
    return { handled: false, detail: 'opportunity event missing id' };
  }
  if (!isValidStage(record.stage)) {
    return { handled: false, detail: `opportunity event has no recognizable stage: ${String(record.stage)}` };
  }

  const newAdminStatus = twentyStageSlugToAdminLeadStatusLive(record.stage);

  const { data: lead, error: findError } = await platformLeadsFrom()
    .select('id, status')
    .eq('twenty_opportunity_id', opportunityId)
    .maybeSingle();

  if (findError) {
    return { handled: false, detail: `lead lookup failed: ${findError.message}` };
  }
  const leadRow = lead as { id: string; status: string } | null;
  if (!leadRow) {
    return { handled: false, detail: `no lead found for opportunity ${opportunityId}` };
  }
  if (leadRow.status === newAdminStatus) {
    return { handled: true, detail: 'status already in sync, no write needed' };
  }

  const { error: updateError } = await platformLeadsFrom()
    .update({ status: newAdminStatus, updated_at: new Date().toISOString() })
    .eq('id', leadRow.id);

  if (updateError) {
    return { handled: false, detail: `lead status update failed: ${updateError.message}` };
  }

  return {
    handled: true,
    detail: `lead ${leadRow.id} status synced from Twenty: ${leadRow.status} -> ${newAdminStatus}`,
  };
}

async function handleTaskEvent(
  record: Record<string, unknown>
): Promise<TwentyWebhookHandlerResult> {
  const taskId = typeof record.id === 'string' ? record.id : null;
  if (!taskId) {
    return { handled: false, detail: 'task event missing id' };
  }
  if (record.status !== 'DONE') {
    return { handled: false, detail: `task status "${String(record.status)}" is not DONE, no action` };
  }

  const { data: followup, error: findError } = await supabaseServer()
    .from('followups')
    .select('id, status')
    .eq('twenty_task_id', taskId)
    .maybeSingle();

  if (findError) {
    return { handled: false, detail: `followup lookup failed: ${findError.message}` };
  }
  const followupRow = followup as { id: string; status: string } | null;
  if (!followupRow) {
    return { handled: false, detail: `no followup found for Twenty task ${taskId}` };
  }
  if (followupRow.status === 'completed') {
    return { handled: true, detail: 'followup already completed, no write needed' };
  }

  const { error: updateError } = await supabaseServer()
    .from('followups')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', followupRow.id);

  if (updateError) {
    return { handled: false, detail: `followup update failed: ${updateError.message}` };
  }

  return { handled: true, detail: `followup ${followupRow.id} marked completed from Twenty task ${taskId}` };
}

export async function handleTwentyWebhookEvent(
  rawPayload: unknown
): Promise<TwentyWebhookHandlerResult> {
  const event = parseEvent(rawPayload);
  if (!event) {
    return { handled: false, detail: 'unrecognized webhook payload shape' };
  }

  const eventTypeLower = event.eventType.toLowerCase();
  if (eventTypeLower.includes('opportunit')) {
    return handleOpportunityEvent(event.record);
  }
  if (eventTypeLower.includes('task')) {
    return handleTaskEvent(event.record);
  }

  return { handled: false, detail: `no handler for event type "${event.eventType}"` };
}
