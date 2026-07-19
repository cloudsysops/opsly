import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { getServiceClient } from '../../../../lib/supabase';

// peskids.* tables pending DB type codegen
interface PeskidsQB {
  insert(data: Record<string, unknown>): PeskidsQB;
  update(data: Record<string, unknown>): PeskidsQB;
  eq(col: string, val: unknown): PeskidsQB;
  then<T>(r: (v: { data: unknown[] | null; error: unknown }) => T, j?: (e: unknown) => T): Promise<T>;
}
interface PeskidsClient { from(table: string): PeskidsQB; }

interface WebhookPayload {
  form_id: string;
  submission_id: string;
  tenant_slug: string;
  form_data: Record<string, unknown>;
  user_id?: string;
  timestamp: number;
}

interface WebhookConfig {
  id: string;
  secret: string;
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

  return expectedSig === signature;
}

async function logAuditEvent(
  supabase: ReturnType<typeof getServiceClient>,
  tenantSlug: string,
  action: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  const { error } = await supabase.schema('peskids').rpc('log_audit_event', {
    p_tenant_slug: tenantSlug,
    p_actor_id: null,
    p_action: action,
    p_resource_type: 'form_submission',
    p_resource_id: resourceId,
    p_metadata: metadata,
    p_ip_address: ipAddress || null,
    p_user_agent: null,
  });

  if (error) {
    console.error('Failed to log audit event:', error);
  }
}

async function validateSignatureHeader(
  supabase: ReturnType<typeof getServiceClient>,
  signatureHeader: string,
  ipAddress: string | undefined
): Promise<string | Response> {
  const [prefix, signature] = signatureHeader.split('=');

  if (prefix?.toLowerCase() !== 'sha256' || !signature) {
    await logAuditEvent(
      supabase,
      'unknown',
      'webhook_verification_failed',
      'unknown',
      {
        reason: 'missing_signature',
        ip_address: ipAddress,
      },
      ipAddress
    );

    return jsonError('Missing or invalid X-Opsly-Signature header', HTTP_STATUS.UNAUTHORIZED);
  }

  return signature;
}

async function parseAndValidatePayload(
  supabase: ReturnType<typeof getServiceClient>,
  bodyText: string,
  ipAddress: string | undefined
): Promise<WebhookPayload | Response> {
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    await logAuditEvent(
      supabase,
      'unknown',
      'webhook_parse_failed',
      'unknown',
      {
        reason: 'invalid_json',
        ip_address: ipAddress,
      },
      ipAddress
    );

    return jsonError('Invalid JSON payload', HTTP_STATUS.BAD_REQUEST);
  }

  const { form_id, submission_id, tenant_slug } = payload;

  if (!form_id || !submission_id || !tenant_slug) {
    await logAuditEvent(
      supabase,
      tenant_slug || 'unknown',
      'webhook_missing_fields',
      'unknown',
      {
        missing_fields: [
          !form_id && 'form_id',
          !submission_id && 'submission_id',
          !tenant_slug && 'tenant_slug',
        ].filter(Boolean),
        ip_address: ipAddress,
      },
      ipAddress
    );

    return jsonError(
      'Missing required fields: form_id, submission_id, tenant_slug',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  return payload;
}

async function fetchAndVerifyConfig(
  supabase: ReturnType<typeof getServiceClient>,
  tenantSlug: string,
  formId: string,
  submissionId: string,
  ipAddress: string | undefined
): Promise<{ id: string; secret: string } | Response> {
  const { data: webhookConfig, error: fetchError } = await supabase
    .from('peskids.webhook_configs')
    .select('id, secret')
    .eq('tenant_slug', tenantSlug)
    .eq('form_id', formId)
    .single();

  if (fetchError || !webhookConfig) {
    await logAuditEvent(
      supabase,
      tenantSlug,
      'webhook_config_not_found',
      formId,
      {
        submission_id: submissionId,
        ip_address: ipAddress,
      },
      ipAddress
    );

    return jsonError('Webhook configuration not found', HTTP_STATUS.NOT_FOUND);
  }

  return webhookConfig;
}

async function storeWebhookEventAndUpdateConfig(
  supabase: ReturnType<typeof getServiceClient>,
  payload: WebhookPayload,
  bodyText: string,
  webhookConfig: WebhookConfig,
  ipAddress: string | undefined
): Promise<void> {
  const db = supabase as unknown as PeskidsClient;
  const { error: eventError } = await db.from('peskids.submission_events').insert({
    tenant_slug: payload.tenant_slug,
    form_id: payload.form_id,
    submission_id: payload.submission_id as string,
    user_id: payload.user_id || null,
    event_type: 'completed',
    metadata: { webhook_triggered: true, timestamp: payload.timestamp },
  });

  if (eventError) {
    console.error('Failed to store submission event:', eventError);
  }

  await db
    .from('peskids.webhook_configs')
    .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
    .eq('id', webhookConfig.id);

  await logAuditEvent(
    supabase,
    payload.tenant_slug,
    'webhook_processed',
    payload.submission_id,
    {
      form_id: payload.form_id,
      payload_size: bodyText.length,
      ip_address: ipAddress,
    },
    ipAddress
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = getServiceClient();
    const ipAddress = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'))
      ?.split(',')[0]
      ?.trim();

    const signatureHeader = request.headers.get('x-opsly-signature') || '';
    const signatureResult = await validateSignatureHeader(supabase, signatureHeader, ipAddress);
    if (signatureResult instanceof Response) {
      return signatureResult;
    }
    const signature = signatureResult;

    const bodyText = await request.text();

    const payloadResult = await parseAndValidatePayload(supabase, bodyText, ipAddress);
    if (payloadResult instanceof Response) {
      return payloadResult;
    }
    const payload = payloadResult;

    const configResult = await fetchAndVerifyConfig(
      supabase,
      payload.tenant_slug,
      payload.form_id,
      payload.submission_id,
      ipAddress
    );
    if (configResult instanceof Response) {
      return configResult;
    }
    const webhookConfig = configResult;

    if (!verifyWebhookSignature(bodyText, signature, webhookConfig.secret)) {
      await logAuditEvent(
        supabase,
        payload.tenant_slug,
        'webhook_signature_mismatch',
        payload.form_id,
        { submission_id: payload.submission_id, ip_address: ipAddress },
        ipAddress
      );
      return jsonError('Invalid webhook signature', HTTP_STATUS.UNAUTHORIZED);
    }

    await logAuditEvent(
      supabase,
      payload.tenant_slug,
      'webhook_received',
      payload.submission_id,
      { form_id: payload.form_id, payload_size: bodyText.length, ip_address: ipAddress },
      ipAddress
    );

    await storeWebhookEventAndUpdateConfig(
      supabase,
      payload,
      bodyText,
      webhookConfig as WebhookConfig,
      ipAddress
    );

    return jsonOk({
      success: true,
      submission_id: payload.submission_id,
      form_id: payload.form_id,
      message: 'Form submission webhook received and processed',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return jsonError('Internal server error processing webhook', HTTP_STATUS.INTERNAL_ERROR);
  }
}
