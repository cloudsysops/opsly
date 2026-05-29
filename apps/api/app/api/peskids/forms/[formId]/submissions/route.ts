import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { triggerWebhooks } from '@/lib/peskids-webhook-trigger';
import type { WebhookConfig, WebhookTriggerResult } from '@/lib/peskids-types';
import { getServiceClient } from '@/lib/supabase';

interface FormSubmissionPayload {
  formId: string;
  submissionData: Record<string, string | number | boolean | null>;
  email?: string;
  userId?: string;
}

interface FormData {
  id: string;
  form_id: string;
  tenant_slug: string;
}

function validateFormSubmissionRequest(
  formId: unknown,
  body: Partial<FormSubmissionPayload>
): { valid: true } | { valid: false; error: Response } {
  if (!formId) {
    return { valid: false, error: jsonError('Missing form ID', HTTP_STATUS.BAD_REQUEST) };
  }
  if (!body.submissionData) {
    return {
      valid: false,
      error: jsonError('Submission data is required', HTTP_STATUS.BAD_REQUEST),
    };
  }
  return { valid: true };
}

async function fetchFormByFormId(
  supabase: ReturnType<typeof getSupabaseClient>,
  formId: string
): Promise<FormData | Response> {
  const { data: form, error: formError } = await supabase
    .from('peskids.forms')
    .select('id, form_id, tenant_slug')
    .eq('form_id', formId)
    .single();

  if (formError || !form) {
    return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
  }
  return form as FormData;
}

async function createSubmissionRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  submissionId: string,
  formId: string,
  tenantSlug: string,
  body: Partial<FormSubmissionPayload>
) {
  const { data: submission, error: submissionError } = await supabase
    .from('peskids.form_submissions')
    .insert({
      submission_id: submissionId,
      form_id: formId,
      tenant_slug: tenantSlug,
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
    return { ok: false as const, error: submissionError };
  }
  return { ok: true as const, submission };
}

async function triggerSubmissionWebhooks(
  supabase: ReturnType<typeof getSupabaseClient>,
  formId: string,
  tenantSlug: string,
  submissionId: string,
  submissionData: Record<string, string | number | boolean | null>,
  userId?: string
): Promise<WebhookTriggerResult | null> {
  try {
    const { data: webhooks } = await supabase
      .from('peskids.webhook_configs')
      .select('id, webhook_url, secret, is_active, failure_count')
      .eq('form_id', formId)
      .eq('tenant_slug', tenantSlug)
      .eq('is_active', true);

    if (!webhooks || webhooks.length === 0) {
      return null;
    }

    return await triggerWebhooks(webhooks as WebhookConfig[], {
      form_id: formId,
      submission_id: submissionId,
      tenant_slug: tenantSlug,
      form_data: submissionData,
      timestamp: Date.now(),
      user_id: userId,
    });
  } catch (webhookError) {
    console.error('Failed to trigger webhooks:', webhookError);
    return null;
  }
}

async function logSubmissionAuditEvent(
  supabase: ReturnType<typeof getSupabaseClient>,
  formId: string,
  submissionId: string,
  tenantSlug: string,
  userId: string | undefined,
  email: string | undefined,
  webhookResults: WebhookTriggerResult | null
): Promise<void> {
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'form_submission_created',
      p_actor_id: userId || 'anonymous',
      p_tenant_slug: tenantSlug,
      p_resource_id: submissionId,
      p_resource_type: 'form_submission',
      p_metadata: {
        form_id: formId,
        email,
        webhooks_triggered: webhookResults?.success || 0,
        webhooks_failed: webhookResults?.failed || 0,
      },
    });
  } catch (auditError) {
    console.error('Failed to log audit event:', auditError);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
): Promise<Response> {
  try {
    const { formId } = await params;
    const body = (await request.json()) as Partial<FormSubmissionPayload>;

    const validation = validateFormSubmissionRequest(formId, body);
    if (!validation.valid) {
      return validation.error;
    }

    const supabase = getServiceClient();

    const formResult = await fetchFormByFormId(supabase, formId as string);
    if (formResult instanceof Response) {
      return formResult;
    }
    const form = formResult;

    const submissionId = crypto.randomUUID();

    const submissionResult = await createSubmissionRecord(
      supabase,
      submissionId,
      formId as string,
      form.tenant_slug,
      body
    );
    if (!submissionResult.ok) {
      return jsonError('Failed to save submission', HTTP_STATUS.INTERNAL_ERROR);
    }

    const webhookResults = await triggerSubmissionWebhooks(
      supabase,
      formId as string,
      form.tenant_slug,
      submissionId,
      body.submissionData as Record<string, string | number | boolean | null>,
      body.userId
    );

    await logSubmissionAuditEvent(
      supabase,
      formId as string,
      submissionId,
      form.tenant_slug,
      body.userId,
      body.email,
      webhookResults
    );

    return jsonOk({
      id: submissionResult.submission.id,
      submissionId,
      formId,
      status: 'completed',
      completedAt: submissionResult.submission.completed_at,
      webhooks: webhookResults,
    });
  } catch (error) {
    console.error('Form submission error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
