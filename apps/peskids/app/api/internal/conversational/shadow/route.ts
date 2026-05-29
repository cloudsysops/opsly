import { NextRequest } from 'next/server';
import type { ChannelKind, InputMessage } from '@intcloudsysops/conversational-runtime';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { getPeskidsShadowRuntime } from '@/lib/peskids-shadow-runtime';
import { appendShadowAudit, listShadowAudit } from '@/lib/shadow-audit-store';

interface ShadowPayload {
  text?: string;
  message?: string;
  audio_url?: string;
  image_url?: string;
  sender?: string;
  channel?: string;
}

function internalSecret(): string | undefined {
  return (
    process.env.PESKIDS_INTERNAL_SECRET ||
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET ||
    process.env.JELOU_WEBHOOK_SECRET
  );
}

function verifyInternal(req: NextRequest): boolean {
  const secret = internalSecret();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const header = req.headers.get('x-internal-secret') || req.headers.get('x-webhook-secret') || '';
  return header.length > 0 && header === secret;
}

function parseChannel(raw: string): ChannelKind {
  if (raw === 'whatsapp' || raw === 'telegram' || raw === 'voice' || raw === 'web') {
    return raw;
  }
  return 'whatsapp';
}

function toInput(body: ShadowPayload, sender: string, channel: ChannelKind): InputMessage | null {
  const audio = body.audio_url?.trim();
  const image = body.image_url?.trim();
  const text = (body.text ?? body.message ?? '').trim();

  if (audio) {
    return { tenantSlug: 'peskids', channel, sender, messageType: 'audio_url', content: audio };
  }
  if (image) {
    return { tenantSlug: 'peskids', channel, sender, messageType: 'image_url', content: image };
  }
  if (text) {
    return { tenantSlug: 'peskids', channel, sender, messageType: 'text', content: text };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  if (!verifyInternal(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }
  return successJson(requestId, { entries: listShadowAudit(50), mode: 'shadow' });
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  if (!verifyInternal(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }

  if (process.env.PESKIDS_CONVERSATIONAL_SHADOW_ENABLED === 'false') {
    return errorJson(requestId, 'Shadow runtime disabled', 503);
  }

  let body: ShadowPayload;
  try {
    body = (await req.json()) as ShadowPayload;
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const sender = (body.sender ?? 'shadow-parent').trim();
  const channel = parseChannel((body.channel ?? 'whatsapp').trim());
  const input = toInput(body, sender, channel);

  if (!input) {
    return errorJson(requestId, 'Provide text, audio_url, or image_url', 400);
  }

  const runtime = getPeskidsShadowRuntime();
  const response = await runtime.handle({ ...input, requestId });

  const audit = appendShadowAudit({
    tenant_slug: 'peskids',
    channel,
    sender,
    raw_input: input.content,
    utterance: response.utterance ?? null,
    intent: response.intent ?? null,
    reply: response.reply,
    trace_id: response.traceId,
  });

  return successJson(requestId, {
    mode: 'shadow',
    shadow: true,
    dispatched_to_production: false,
    reply: response.reply,
    intent: response.intent,
    trace_id: response.traceId,
    event_ids: response.eventIds,
    audit_id: audit.id,
    runtime_status: response.runtime.event?.status ?? null,
  });
}
