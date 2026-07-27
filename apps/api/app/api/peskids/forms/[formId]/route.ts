import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { getServiceClient } from '@/lib/supabase';
import { extractIp } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter-memory';

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

interface DBForm {
  id: string;
  form_id: string;
  tenant_slug: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PeskidsQB {
  select(cols?: string, opts?: Record<string, unknown>): PeskidsQB;
  eq(col: string, val: unknown): PeskidsQB;
  single(): Promise<{ data: unknown | null; error: unknown }>;
}

interface PeskidsClient {
  from(table: string): PeskidsQB;
  rpc(fn: string, params: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

function mapFormFields(fields: DBFormField[] | null): FormField[] {
  return (fields || []).map((field) => ({
    id: field.field_id,
    type: field.field_type,
    label: field.label,
    required: field.required,
    options: field.options,
  }));
}

async function fetchFormAndFields(
  supabase: ReturnType<typeof getServiceClient>,
  formId: string
): Promise<{ error: string; status: number } | { form: DBForm; fields: DBFormField[] }> {
  const { data: form, error: formError } = await supabase
    .schema('peskids')
    .from('forms')
    .select('id, form_id, tenant_slug, title, description, status, created_at, updated_at')
    .eq('form_id', formId)
    .single();

  if (formError || !form) {
    return { error: 'Form not found', status: HTTP_STATUS.NOT_FOUND };
  }

  const { data: fields, error: fieldsError } = await supabase
    .schema('peskids')
    .from('form_fields')
    .select('field_id, field_type, label, required, options, order')
    .eq('form_id', formId)
    .order('order', { ascending: true });

  if (fieldsError) {
    console.error('Failed to fetch form fields:', fieldsError);
    return { error: 'Failed to fetch form', status: HTTP_STATUS.INTERNAL_ERROR };
  }

  return { form: form as DBForm, fields: fields as DBFormField[] };
}

async function logRetrievalAuditEvent(
  supabase: ReturnType<typeof getServiceClient>,
  formId: string,
  tenantSlug: string,
  ip: string | null
): Promise<void> {
  try {
    const db = supabase as unknown as PeskidsClient;
    const actorId = ip ? `anonymous:${ip}` : 'anonymous';
    await db.rpc('log_audit_event', {
      p_action: 'form_retrieved',
      p_actor_id: actorId,
      p_tenant_slug: tenantSlug,
      p_resource_id: formId,
      p_resource_type: 'form',
      p_metadata: { ip },
    });
  } catch (err) {
    console.error('Failed to log retrieval audit event:', err);
  }
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

    // Security: Rate limit based on IP to prevent spamming form retrieval
    const ip = extractIp(request);
    const rateLimit = await checkRateLimit(
      ip ? `peskids-form-get:${ip}` : 'peskids-form-get:anonymous'
    );
    if (!rateLimit.allowed) {
      return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    const supabase = getServiceClient();
    const result = await fetchFormAndFields(supabase, formId);
    if ('error' in result) {
      return jsonError(result.error, result.status);
    }

    const { form, fields } = result;
    const formData: Form = {
      id: form.id,
      title: form.title,
      description: form.description || '',
      fields: mapFormFields(fields),
      settings: {
        successMessage: 'Thank you for your submission!',
      },
      status: form.status,
      createdAt: form.created_at,
      updatedAt: form.updated_at,
    };

    // Security: Log retrieval audit event
    await logRetrievalAuditEvent(supabase, formId, form.tenant_slug, ip);

    return jsonOk(formData);
  } catch (error) {
    console.error('Form retrieval error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
