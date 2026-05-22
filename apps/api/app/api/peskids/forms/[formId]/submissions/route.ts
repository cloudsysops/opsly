import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError, jsonOk } from '../../../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { triggerWebhooks } from '../../../../../../../lib/peskids-webhook-trigger';

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

interface FormSubmissionPayload {
  formId: string;
  submissionData: Record<string, string | number | boolean | null>;
  email?: string;
  userId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } }
): Promise<Response> {
  try {
    const formId = params.formId;

    if (!formId) {
      return jsonError('Missing form ID', HTTP_STATUS.BAD_REQUEST);
    }

    const body = await request.json() as Partial<FormSubmissionPayload>;

    if (!body.submissionData) {
      return jsonError('Submission data is required', HTTP_STATUS.BAD_REQUEST);
    }

    const supabase = getSupabaseClient();

    // Get form to find tenant_slug
    const { data: form, error: formError } = await supabase
      .from('peskids.forms')
      .select('id, form_id, tenant_slug')
      .eq('form_id', formId)
      .single();

    if (formError || !form) {
      return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
    }

    const submissionId = crypto.randomUUID();

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('peskids.form_submissions')
      .insert({
        submission_id: submissionId,
        form_id: formId,
        tenant_slug: form.tenant_slug,
        submission_data: body.submissionData,
        email: body.email || null,
        user_id: body.userId || null,
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Failed to create submission:', submissionError);
      return jsonError('Failed to save submission', HTTP_STATUS.INTERNAL_ERROR);
    }

    // Trigger webhooks for this form
    let webhookResults: { success: number; failed: number; errors: string[] } | null = null;
    try {
      const { data: webhooks } = await supabase
        .from('peskids.webhook_configs')
        .select('id, webhook_url, secret, is_active, failure_count')
        .eq('form_id', formId)
        .eq('tenant_slug', form.tenant_slug)
        .eq('is_active', true);

      if (webhooks && webhooks.length > 0) {
        webhookResults = await triggerWebhooks(webhooks as any, {
          form_id: formId,
          submission_id: submissionId,
          tenant_slug: form.tenant_slug,
          form_data: body.submissionData,
          timestamp: Date.now(),
          user_id: body.userId,
        });
      }
    } catch (webhookError) {
      console.error('Failed to trigger webhooks:', webhookError);
      // Continue - submission was created, just webhooks failed
    }

    // Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'form_submission_created',
        p_actor_id: body.userId || 'anonymous',
        p_tenant_slug: form.tenant_slug,
        p_resource_id: submissionId,
        p_resource_type: 'form_submission',
        p_metadata: {
          form_id: formId,
          email: body.email,
          webhooks_triggered: webhookResults?.success || 0,
          webhooks_failed: webhookResults?.failed || 0,
        },
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Continue - submission was created, just audit failed
    }

    return jsonOk({
      id: submission.id,
      submissionId,
      formId,
      status: 'completed',
      completedAt: submission.completed_at,
      webhooks: webhookResults,
    });
  } catch (error) {
    console.error('Form submission error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
