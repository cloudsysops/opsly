import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { jsonError, jsonOk } from '../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../lib/constants';

interface WebhookPayload {
  form_id: string;
  submission_id: string;
  tenant_slug: string;
  form_data: Record<string, unknown>;
  user_id?: string;
  timestamp: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return expectedSig === signature;
}

async function logAuditEvent(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantSlug: string,
  action: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  const { error } = await supabase.rpc('peskids.log_audit_event', {
    p_tenant_slug: tenantSlug,
    p_actor_id: null,
    p_action: action,
    p_resource_type: 'form_submission',
    p_resource_id: resourceId,
    p_metadata: metadata,
    p_ip_address: ipAddress,
    p_user_agent: null,
  });

  if (error) {
    console.error('Failed to log audit event:', error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = getSupabaseClient();
    const ipAddress = (request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip'))?.split(',')[0]?.trim();

    // Extract webhook signature from header (case-insensitive prefix)
    const signatureHeader = request.headers.get('x-opsly-signature') || '';
    const [prefix, signature] = signatureHeader.split('=');

    if (prefix?.toLowerCase() !== 'sha256' || !signature) {
      await logAuditEvent(supabase, 'unknown', 'webhook_verification_failed', 'unknown', {
        reason: 'missing_signature',
        ip_address: ipAddress,
      }, ipAddress);

      return jsonError('Missing or invalid X-Opsly-Signature header', HTTP_STATUS.UNAUTHORIZED);
    }

    const bodyText = await request.text();

    // Extract tenant slug and form ID from request
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      await logAuditEvent(supabase, 'unknown', 'webhook_parse_failed', 'unknown', {
        reason: 'invalid_json',
        ip_address: ipAddress,
      }, ipAddress);

      return jsonError('Invalid JSON payload', HTTP_STATUS.BAD_REQUEST);
    }

    const { form_id, submission_id, tenant_slug } = payload;

    if (!form_id || !submission_id || !tenant_slug) {
      await logAuditEvent(supabase, tenant_slug || 'unknown', 'webhook_missing_fields', 'unknown', {
        missing_fields: [!form_id && 'form_id', !submission_id && 'submission_id', !tenant_slug && 'tenant_slug'].filter(Boolean),
        ip_address: ipAddress,
      }, ipAddress);

      return jsonError('Missing required fields: form_id, submission_id, tenant_slug', HTTP_STATUS.BAD_REQUEST);
    }

    // Fetch webhook config for this form
    const { data: webhookConfig, error: fetchError } = await supabase
      .from('peskids.webhook_configs')
      .select('id, secret')
      .eq('tenant_slug', tenant_slug)
      .eq('form_id', form_id)
      .single();

    if (fetchError || !webhookConfig) {
      await logAuditEvent(supabase, tenant_slug, 'webhook_config_not_found', form_id, {
        submission_id,
        ip_address: ipAddress,
      }, ipAddress);

      return jsonError('Webhook configuration not found', HTTP_STATUS.NOT_FOUND);
    }

    // Verify signature using stored secret
    if (!verifyWebhookSignature(bodyText, signature, webhookConfig.secret)) {
      await logAuditEvent(supabase, tenant_slug, 'webhook_signature_mismatch', form_id, {
        submission_id,
        ip_address: ipAddress,
      }, ipAddress);

      return jsonError('Invalid webhook signature', HTTP_STATUS.UNAUTHORIZED);
    }

    // Log successful webhook receipt
    await logAuditEvent(supabase, tenant_slug, 'webhook_received', submission_id, {
      form_id,
      payload_size: bodyText.length,
      ip_address: ipAddress,
    }, ipAddress);

    // Store submission event
    const { error: eventError } = await supabase
      .from('peskids.submission_events')
      .insert({
        tenant_slug,
        form_id,
        submission_id: submission_id as string,
        user_id: payload.user_id || null,
        event_type: 'completed',
        metadata: {
          webhook_triggered: true,
          timestamp: payload.timestamp,
        },
      });

    if (eventError) {
      console.error('Failed to store submission event:', eventError);
    }

    // Update webhook last_triggered_at
    await supabase
      .from('peskids.webhook_configs')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: 0,
      })
      .eq('id', webhookConfig.id);

    return jsonOk({
      success: true,
      submission_id,
      form_id,
      message: 'Form submission webhook received and processed',
    });
  } catch (error) {
    console.error('Webhook error:', error);

    return jsonError(
      'Internal server error processing webhook',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}
