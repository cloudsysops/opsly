import { getServiceClient } from '../supabase';
import { logger } from '../logger';
import { PESKIDS_MESSAGE_STATUSES } from './constants';
import { PESKIDS_N8N_SEND_APPROVED_PATH, fetchWithRetry } from './automation';

export type PeskidsMessageRow = {
  id: string;
  tenant_slug: string;
  thread_id: string;
  source: string;
  inbound_content: string;
  parent_name: string | null;
  child_name: string | null;
  suggested_response: string | null;
  status: (typeof PESKIDS_MESSAGE_STATUSES)[number];
  approved_at: string | null;
  approved_by: string | null;
  modified_response: string | null;
  rejection_reason: string | null;
  sent_at: string | null;
  n8n_webhook_response: string | null;
  created_at: string;
  updated_at: string;
};

export type PendingMessageItem = {
  id: string;
  thread_id: string;
  source: string;
  inbound_content: string;
  parent_name: string | null;
  child_name: string | null;
  suggested_response: string | null;
  created_at: string;
};

const MESSAGE_SELECT = [
  'id',
  'tenant_slug',
  'thread_id',
  'source',
  'inbound_content',
  'parent_name',
  'child_name',
  'suggested_response',
  'status',
  'approved_at',
  'approved_by',
  'modified_response',
  'rejection_reason',
  'sent_at',
  'n8n_webhook_response',
  'created_at',
  'updated_at',
].join(', ');

export async function fetchPendingMessages(
  tenantSlug: string
): Promise<{ ok: true; messages: PendingMessageItem[] } | { ok: false; error: string }> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('peskids_messages')
    .select(MESSAGE_SELECT)
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error !== null) {
    logger.error('peskids.messages.fetch_pending_failed', {
      tenantSlug,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }

  const rows = (data ?? []) as unknown as PeskidsMessageRow[];
  const messages: PendingMessageItem[] = rows.map((row) => ({
    id: row.id,
    thread_id: row.thread_id,
    source: row.source,
    inbound_content: row.inbound_content,
    parent_name: row.parent_name,
    child_name: row.child_name,
    suggested_response: row.suggested_response,
    created_at: row.created_at,
  }));

  return { ok: true, messages };
}

async function dispatchSendApproved(
  messageId: string,
  tenantSlug: string,
  source: string,
  threadId: string,
  responseText: string
): Promise<{ ok: true; detail: string } | { ok: false; detail: string }> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    return { ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' };
  }

  try {
    const response = await fetchWithRetry(`${base}${PESKIDS_N8N_SEND_APPROVED_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        source,
        to: threadId,
        text: responseText,
        tenant_id: tenantSlug,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, detail: `n8n returned ${response.status}: ${body}` };
    }

    return { ok: true, detail: `queued at ${new Date().toISOString()}` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, detail };
  }
}

export async function approveMessage(
  messageId: string,
  tenantSlug: string,
  approvedBy: string,
  modifiedResponse?: string
): Promise<{ ok: true; sent_at: string } | { ok: false; error: string }> {
  const db = getServiceClient();

  const { data: message, error: fetchError } = await db
    .schema('platform')
    .from('peskids_messages')
    .select(MESSAGE_SELECT)
    .eq('id', messageId)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle();

  if (fetchError !== null || message === null) {
    return { ok: false, error: fetchError?.message ?? 'Message not found' };
  }

  const msg = message as unknown as PeskidsMessageRow;
  if (msg.status !== 'pending_approval') {
    return {
      ok: false,
      error: `Message is not pending approval (status: ${msg.status})`,
    };
  }

  const responseText = modifiedResponse ?? msg.suggested_response ?? '';
  if (!responseText) {
    return { ok: false, error: 'No response text to send' };
  }

  const n8nResult = await dispatchSendApproved(
    msg.id,
    msg.tenant_slug,
    msg.source,
    msg.thread_id,
    responseText
  );

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status: n8nResult.ok ? 'sent' : 'failed',
    approved_at: now,
    approved_by: approvedBy,
    sent_at: n8nResult.ok ? now : null,
    n8n_webhook_response: n8nResult.detail,
    updated_at: now,
  };
  if (modifiedResponse !== undefined) {
    updateData.modified_response = modifiedResponse;
  }

  const { error: updateError } = await db
    .schema('platform')
    .from('peskids_messages')
    .update(updateData)
    .eq('id', messageId);

  if (updateError !== null) {
    logger.error('peskids.messages.approve_update_failed', {
      messageId,
      error: updateError.message,
    });
  }

  if (!n8nResult.ok) {
    return { ok: false, error: n8nResult.detail };
  }

  return { ok: true, sent_at: now };
}

export async function rejectMessage(
  messageId: string,
  tenantSlug: string,
  approvedBy: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getServiceClient();

  const { error } = await db
    .schema('platform')
    .from('peskids_messages')
    .update({
      status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('tenant_slug', tenantSlug);

  if (error !== null) {
    logger.error('peskids.messages.reject_failed', {
      messageId,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
