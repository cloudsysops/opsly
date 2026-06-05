import { NextRequest } from 'next/server';
import { applyCollectionUpdates } from '@/lib/collection';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { getPaniniRuntime } from '@/lib/panini-runtime';
import type { ChannelKind, InputMessage } from '@intcloudsysops/conversational-runtime';

interface InboundPayload {
  text?: string;
  message?: string;
  audio_url?: string;
  image_url?: string;
  sender?: string;
  channel?: string;
}

function webhookSecret(): string | undefined {
  return process.env.PANINI_INBOUND_WEBHOOK_SECRET?.trim();
}

function verifyInboundSecret(req: NextRequest): boolean {
  const secret = webhookSecret();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const header =
    req.headers.get('x-webhook-secret') || req.headers.get('x-panini-webhook-secret') || '';
  return header.length > 0 && header === secret;
}

function parseChannel(raw: string): ChannelKind {
  if (raw === 'whatsapp' || raw === 'telegram' || raw === 'voice' || raw === 'web') {
    return raw;
  }
  return 'web';
}

function toInputMessage(
  body: InboundPayload,
  sender: string,
  channelRaw: string
): InputMessage | null {
  const channel = parseChannel(channelRaw);
  const audio = body.audio_url?.trim();
  const image = body.image_url?.trim();
  const text = (body.text ?? body.message ?? '').trim();

  if (audio) {
    return {
      tenantSlug: 'panini-lab',
      channel,
      sender,
      messageType: 'audio_url',
      content: audio,
    };
  }
  if (image) {
    return {
      tenantSlug: 'panini-lab',
      channel,
      sender,
      messageType: 'image_url',
      content: image,
    };
  }
  if (text) {
    return {
      tenantSlug: 'panini-lab',
      channel,
      sender,
      messageType: 'text',
      content: text,
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  if (!verifyInboundSecret(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }

  let body: InboundPayload;
  try {
    body = (await req.json()) as InboundPayload;
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const sender = (body.sender ?? 'demo-user').trim();
  const channelRaw = (body.channel ?? 'web').trim();
  const input = toInputMessage(body, sender, channelRaw);

  if (!input) {
    return errorJson(requestId, 'Provide text, audio_url, or image_url', 400);
  }

  const runtime = getPaniniRuntime();
  const response = await runtime.handle({ ...input, requestId });

  let collectionUpdates: Awaited<ReturnType<typeof applyCollectionUpdates>> = [];
  if (response.intent === 'UPDATE_COLLECTION' && response.ok && response.utterance) {
    collectionUpdates = await applyCollectionUpdates(response.utterance);
  }

  return successJson(requestId, {
    reply: response.reply,
    trace_id: response.traceId,
    intent: response.intent,
    event_ids: response.eventIds,
    collection_updates: collectionUpdates,
  });
}
