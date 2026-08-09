import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '../../../../../lib/api-response';
import { extractIp } from '../../../../../lib/audit';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { checkRateLimit } from '../../../../../lib/rate-limiter-memory';
import { getServiceClient } from '../../../../../lib/supabase';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

interface DBFormField {
  field_id: string;
  field_type: string;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  order: number;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    successMessage: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PeskidsClient {
  rpc(fn: string, params: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

async function fetchFormWithFields(
  supabase: ReturnType<typeof getServiceClient>,
  formId: string
): Promise<{ tenant_slug: string; formData: Form } | null> {
  const { data: form, error: formError } = await supabase
    .schema('peskids')
    .from('forms')
    .select('id, form_id, tenant_slug, title, description, status, created_at, updated_at')
    .eq('form_id', formId)
    .single();

  if (formError || !form) {
    return null;
  }

  const { data: fields, error: fieldsError } = await supabase
    .schema('peskids')
    .from('form_fields')
    .select('field_id, field_type, label, required, options, order')
    .eq('form_id', formId)
    .order('order', { ascending: true });

  if (fieldsError) {
    console.error('Failed to fetch form fields:', fieldsError);
    throw new Error('Failed to fetch form fields');
  }

  const formData: Form = {
    id: form.id,
    title: form.title,
    description: form.description || '',
    fields: ((fields as DBFormField[] | null) || []).map((field) => ({
      id: field.field_id,
      type: field.field_type,
      label: field.label,
      required: field.required,
      options: field.options,
    })),
    settings: {
      successMessage: 'Thank you for your submission!',
    },
    status: form.status,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
  };

  return { tenant_slug: form.tenant_slug, formData };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
): Promise<Response> {
  try {
    const { formId } = await params;
    if (!formId) {
      return jsonError('Missing form ID', HTTP_STATUS.BAD_REQUEST);
    }

    // Security: IP rate limiting to prevent form metadata scraping
    const ip = extractIp(request);
    const rateLimitKey = ip ? `peskids-form-get:${ip}` : 'peskids-form-get:anonymous';
    const rateLimit = await checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    const supabase = getServiceClient();
    const result = await fetchFormWithFields(supabase, formId);
    if (!result) {
      return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
    }

    // Security: Log audit event for retrieving a form
    try {
      const db = supabase as unknown as PeskidsClient;
      const actorId = ip ? `anonymous:${ip}` : 'anonymous';
      await db.rpc('log_audit_event', {
        p_action: 'form_retrieved',
        p_actor_id: actorId,
        p_tenant_slug: result.tenant_slug,
        p_resource_id: formId,
        p_resource_type: 'form',
        p_metadata: { ip },
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return jsonOk(result.formData);
  } catch (error) {
    console.error('Form retrieval error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
