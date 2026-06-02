import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { randomBytes } from 'crypto';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

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

function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; formId: string }> }
): Promise<Response> {
  const { tenantSlug, formId } = await params;

  return runTrustedPortalDalForPathSlug(
    request,
    tenantSlug,
    async () => {
      try {
        if (!tenantSlug || !formId) {
          return jsonError('Missing tenant slug or form ID', HTTP_STATUS.BAD_REQUEST);
        }

        const supabase = getServiceClient();

        // Get webhook configs for this form
        const { data: configs, error: configError } = await supabase
          .schema('peskids').from('webhook_configs')
          .select(
            'id, form_id, tenant_slug, webhook_url, is_active, failure_count, last_triggered_at, created_at, updated_at'
          )
          .eq('tenant_slug', tenantSlug)
          .eq('form_id', formId)
          .order('created_at', { ascending: false });

        if (configError) {
          console.error('Failed to fetch webhook configs:', configError);
          return jsonError('Failed to fetch webhook configurations', HTTP_STATUS.INTERNAL_ERROR);
        }

        return jsonOk({
          webhooks: configs || [],
          count: (configs || []).length,
        });
      } catch (error) {
        console.error('Webhook config retrieval error:', error);
        return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
      }
    },
    PORTAL_READ_ACCESS
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; formId: string }> }
): Promise<Response> {
  const { tenantSlug, formId } = await params;

  return runTrustedPortalDalForPathSlug(request, tenantSlug, async (session) => {
    try {
      if (!tenantSlug || !formId) {
        return jsonError('Missing tenant slug or form ID', HTTP_STATUS.BAD_REQUEST);
      }

      const body = (await request.json()) as { webhook_url: string; is_active?: boolean };

      if (!body.webhook_url) {
        return jsonError('webhook_url is required', HTTP_STATUS.BAD_REQUEST);
      }

      // Validate webhook URL
      try {
        new URL(body.webhook_url);
      } catch {
        return jsonError('Invalid webhook_url format', HTTP_STATUS.BAD_REQUEST);
      }

      const supabase = getServiceClient();

      // Verify form exists and belongs to tenant
      const { data: form, error: formError } = await supabase
        .schema('peskids').from('forms')
        .select('id, form_id')
        .eq('form_id', formId)
        .eq('tenant_slug', tenantSlug)
        .single();

      if (formError || !form) {
        return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
      }

      // Generate secret for webhook
      const secret = generateSecret();

      // Create webhook config
      const { data: config, error: createError } = await supabase
        .schema('peskids').from('webhook_configs')
        .insert({
          form_id: formId,
          tenant_slug: tenantSlug,
          webhook_url: body.webhook_url,
          secret,
          is_active: body.is_active !== false,
          failure_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create webhook config:', createError);
        return jsonError('Failed to create webhook configuration', HTTP_STATUS.INTERNAL_ERROR);
      }

      // Log audit event
      try {
        await supabase.schema('peskids').rpc('log_audit_event', {
          p_action: 'form_webhook_configured',
          p_actor_id: session.user.id,
          p_tenant_slug: tenantSlug,
          p_resource_id: formId,
          p_resource_type: 'form',
          p_metadata: {
            webhook_id: config.id,
            webhook_url: body.webhook_url,
          },
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }

      return jsonOk(
        {
          id: config.id,
          form_id: config.form_id,
          webhook_url: config.webhook_url,
          is_active: config.is_active,
          secret: config.secret,
          created_at: config.created_at,
          message: 'Webhook configured successfully. Store the secret securely.',
        },
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      console.error('Webhook config creation error:', error);
      return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; formId: string }> }
): Promise<Response> {
  const { tenantSlug, formId } = await params;

  return runTrustedPortalDalForPathSlug(request, tenantSlug, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const webhookId = searchParams.get('webhook_id');

      if (!tenantSlug || !formId || !webhookId) {
        return jsonError('Missing required parameters', HTTP_STATUS.BAD_REQUEST);
      }

      const supabase = getServiceClient();

      // Delete webhook config
      const { error: deleteError } = await supabase
        .schema('peskids').from('webhook_configs')
        .delete()
        .eq('id', webhookId)
        .eq('tenant_slug', tenantSlug)
        .eq('form_id', formId);

      if (deleteError) {
        console.error('Failed to delete webhook config:', deleteError);
        return jsonError('Failed to delete webhook configuration', HTTP_STATUS.INTERNAL_ERROR);
      }

      // Log audit event
      try {
        await supabase.schema('peskids').rpc('log_audit_event', {
          p_action: 'form_webhook_deleted',
          p_actor_id: session.user.id,
          p_tenant_slug: tenantSlug,
          p_resource_id: formId,
          p_resource_type: 'form',
          p_metadata: {
            webhook_id: webhookId,
          },
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }

      return jsonOk({
        success: true,
        message: 'Webhook configuration deleted',
      });
    } catch (error) {
      console.error('Webhook config deletion error:', error);
      return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
    }
  });
}
