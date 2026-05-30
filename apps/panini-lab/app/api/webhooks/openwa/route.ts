import { NextRequest } from 'next/server';
import { parseOpenWAWebhookRequest, sendTextMessageForTenant } from '@intcloudsysops/openwa';
import { applyCollectionUpdates } from '@/lib/collection';
import { getPaniniRuntime } from '@/lib/panini-runtime';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

/** POST /api/webhooks/openwa — Panini Lab WhatsApp inbound (OpenWA gateway). */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const rawBody = await req.text();
  const parsed = await parseOpenWAWebhookRequest(rawBody, req.headers, 'panini-lab');
  if (!parsed.ok) {
    return errorJson(requestId, parsed.error, parsed.status);
  }

  const { payload, message: msg } = parsed.parsed;
  if (!msg) {
    return successJson(requestId, { skipped: true, event: payload.event });
  }

  const runtime = getPaniniRuntime();
  const response = await runtime.handle({
    tenantSlug: 'panini-lab',
    channel: 'whatsapp',
    sender: msg.sender,
    messageType: 'text',
    content: msg.text,
    requestId,
  });

  let collectionUpdates: Awaited<ReturnType<typeof applyCollectionUpdates>> = [];
  if (response.intent === 'UPDATE_COLLECTION' && response.ok && response.utterance) {
    collectionUpdates = await applyCollectionUpdates(response.utterance);
  }

  if (response.reply) {
    void sendTextMessageForTenant('panini-lab', msg.chatId, response.reply).catch(
      (err: unknown) => {
        console.error('[openwa/panini] reply failed', {
          to: msg.chatId,
          error: err instanceof Error ? err.message : String(err),
          requestId,
        });
      }
    );
  }

  return successJson(requestId, {
    reply: response.reply,
    intent: response.intent,
    event_ids: response.eventIds,
    collection_updates: collectionUpdates,
  });
}
