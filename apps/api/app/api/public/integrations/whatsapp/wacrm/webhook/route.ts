/**
 * POST /api/public/integrations/whatsapp/wacrm/webhook
 *
 * WACRM Webhook Integration
 * - Processes events from WACRM (messages, status updates)
 * - Validates webhook secret
 * - Persists to Supabase
 * - Triggers n8n workflows
 */

import type { NextRequest } from 'next/server';
import { parseJsonBody } from '../../../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { whatsappConfig, WacrmWhatsAppProvider, WhatsAppSignatureError } from '../../../../../../../lib/whatsapp';

/**
 * POST - WACRM Webhook Event Processing
 */
export async function POST(request: NextRequest): Promise<Response> {
  const wacrmConfig = whatsappConfig.getWacrmConfig();
  const tenantId = 'peskids'; // TODO: Extract from request or use multi-tenant pattern

  if (!wacrmConfig.enabled) {
    console.warn('[WACRM Webhook] WACRM integration disabled');
    return Response.json({ error: 'wacrm integration disabled' }, { status: HTTP_STATUS.FORBIDDEN });
  }

  // Parse request body
  const bodyParsed = await parseJsonBody(request);
  if (!bodyParsed.ok) {
    return bodyParsed.response;
  }

  const payload = bodyParsed.body;

  // Extract signature from header
  const signature = request.headers.get('x-wacrm-signature') || '';

  // Validate signature
  const wacrmProvider = new WacrmWhatsAppProvider(tenantId, {
    baseUrl: wacrmConfig.baseUrl,
    apiKey: wacrmConfig.apiKey,
    webhookSecret: wacrmConfig.webhookSecret,
  });

  try {
    const isValid = await wacrmProvider.verifyWebhook('', signature, payload);

    if (!isValid) {
      throw new WhatsAppSignatureError('wacrm');
    }
  } catch (err) {
    console.error('[WACRM Webhook] Signature validation failed:', err);
    return Response.json({ error: 'invalid signature' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  // Parse canonical event
  try {
    const event = await wacrmProvider.parseInboundWebhook(payload);

    // TODO: Persist event to Supabase (whatsapp_messages, whatsapp_message_events, etc.)
    // TODO: Trigger n8n workflow for lead intake
    // TODO: Handle different event types (message, status, template)

    console.log('[WACRM Webhook] Event processed:', {
      eventType: event.event,
      tenant: event.tenantId,
      messageId: 'data' in event.data ? event.data.id : 'N/A',
    });

    return Response.json({ ok: true, event_type: event.event }, { status: HTTP_STATUS.OK });
  } catch (err) {
    console.error('[WACRM Webhook] Event processing failed:', err);
    // Always return 200 to prevent WACRM retries of malformed events
    return Response.json({ ok: false, error: 'processing_error' }, { status: HTTP_STATUS.OK });
  }
}
