/**
 * GET /api/public/integrations/whatsapp/meta/webhook
 * POST /api/public/integrations/whatsapp/meta/webhook
 *
 * Meta WhatsApp Cloud API Webhook Integration
 * - GET: Responds to hub.challenge (webhook verification)
 * - POST: Processes inbound events (messages, status, templates)
 */

import type { NextRequest } from 'next/server';
import { parseJsonBody } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { whatsappConfig, MetaCloudWhatsAppProvider, WhatsAppSignatureError } from '@intcloudsysops/whatsapp';

/**
 * GET - Webhook Verification Challenge
 * Meta sends: hub.mode, hub.challenge, hub.verify_token
 */
export async function GET(request: NextRequest): Promise<Response> {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');

  if (mode !== 'subscribe') {
    return Response.json({ error: 'invalid hub.mode' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const metaConfig = whatsappConfig.getMetaConfig();

  if (!metaConfig.enabled) {
    console.warn('[Meta Webhook] Meta integration disabled');
    return Response.json({ error: 'meta integration disabled' }, { status: HTTP_STATUS.FORBIDDEN });
  }

  if (verifyToken !== metaConfig.verifyToken) {
    console.warn('[Meta Webhook] Invalid verify token');
    return Response.json({ error: 'invalid verify token' }, { status: HTTP_STATUS.FORBIDDEN });
  }

  if (!challenge) {
    return Response.json({ error: 'missing hub.challenge' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  console.log('[Meta Webhook] Challenge verified successfully');
  return new Response(challenge, { status: HTTP_STATUS.OK });
}

/**
 * POST - Webhook Event Processing
 * Validates signature, parses event, persists to Supabase
 */
export async function POST(request: NextRequest): Promise<Response> {
  const metaConfig = whatsappConfig.getMetaConfig();
  const tenantId = 'peskids'; // TODO: Extract from request or use multi-tenant pattern

  if (!metaConfig.enabled) {
    console.warn('[Meta Webhook] Meta integration disabled');
    return Response.json({ error: 'meta integration disabled' }, { status: HTTP_STATUS.FORBIDDEN });
  }

  // Parse request body
  const bodyParsed = await parseJsonBody(request);
  if (!bodyParsed.ok) {
    return bodyParsed.response;
  }

  const payload = bodyParsed.body;

  // Extract signature from header
  const signature = request.headers.get('x-hub-signature-256') || '';

  // Validate signature
  const metaProvider = new MetaCloudWhatsAppProvider(tenantId, {
    appId: metaConfig.appId,
    appSecret: metaConfig.appSecret,
    accessToken: metaConfig.accessToken,
    wabaId: metaConfig.wabaId,
    phoneNumberId: metaConfig.phoneNumberId,
    apiVersion: metaConfig.apiVersion,
  });

  try {
    const isValid = await metaProvider.verifyWebhook(metaConfig.verifyToken, signature, payload);

    if (!isValid) {
      throw new WhatsAppSignatureError('meta');
    }
  } catch (err) {
    console.error('[Meta Webhook] Signature validation failed:', err);
    return Response.json({ error: 'invalid signature' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  // Parse canonical event
  try {
    const event = await metaProvider.parseInboundWebhook(payload);

    // TODO: Persist event to Supabase (whatsapp_messages, whatsapp_message_events, etc.)
    // TODO: Trigger n8n workflow for lead intake
    // TODO: Handle different event types (message, status, template)

    console.log('[Meta Webhook] Event processed:', {
      eventType: event.event,
      tenant: event.tenantId,
      messageId: 'data' in event.data ? event.data.id : 'N/A',
    });

    return Response.json({ ok: true, event_type: event.event }, { status: HTTP_STATUS.OK });
  } catch (err) {
    console.error('[Meta Webhook] Event processing failed:', err);
    // Always return 200 to prevent Meta retries of malformed events
    return Response.json({ ok: false, error: 'processing_error' }, { status: HTTP_STATUS.OK });
  }
}
