import { NextRequest } from 'next/server';
import { validateStaffSession } from '@/lib/staff-auth';
import {
  approveAndDispatchWhatsApp,
  listWhatsAppOutbox,
} from '@/lib/integrations/whatsapp-outbound';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import type { OutboxRecord } from '@intcloudsysops/whatsapp-channel';

function tenantId(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

/**
 * GET — list outbox rows for admin WhatsApp panel (sandbox-safe; table may be empty).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffSession();
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const statusParam = req.nextUrl.searchParams.get('status');
    const status =
      statusParam === 'pending_approval' ||
      statusParam === 'approved' ||
      statusParam === 'sending' ||
      statusParam === 'sent' ||
      statusParam === 'failed' ||
      statusParam === 'cancelled'
        ? (statusParam as OutboxRecord['status'])
        : undefined;

    const items = await listWhatsAppOutbox({
      tenantSlug: tenantId(),
      status,
      limit: 50,
    });

    return successJson(requestId, { items, count: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'outbox_list_failed';
    // Missing migration → empty list (sandbox-first; do not 500 the panel)
    if (/relation|does not exist|schema cache/i.test(message)) {
      return successJson(requestId, { items: [], count: 0, note: 'outbox_table_unavailable' });
    }
    return errorJson(requestId, message, 500);
  }
}

/**
 * POST — approve + dispatch a pending outbox row via Meta (same path as message reply send).
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffSession();
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const body = (await req.json()) as {
      outboxId?: unknown;
      toPhone?: unknown;
      body?: unknown;
      parentMessageId?: unknown;
    };

    const outboxId = typeof body.outboxId === 'string' ? body.outboxId.trim() : '';
    const toPhone = typeof body.toPhone === 'string' ? body.toPhone.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const parentMessageId =
      typeof body.parentMessageId === 'string' ? body.parentMessageId.trim() : outboxId;

    if (!outboxId || !toPhone || !text) {
      return errorJson(requestId, 'outboxId, toPhone and body are required', 400);
    }

    const result = await approveAndDispatchWhatsApp({
      tenantSlug: tenantId(),
      outboxId,
      toPhone,
      body: text,
      parentMessageId,
    });

    return successJson(requestId, {
      outbox: result.outbox,
      send: result.send,
      never_marked_sent_when_skipped: Boolean(result.send?.skipped),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'outbox_dispatch_failed';
    return errorJson(requestId, message, 500);
  }
}
