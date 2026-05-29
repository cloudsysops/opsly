import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

interface FormMetadata {
  formId: string;
  formTitle: string;
  description?: string;
  submissionCount: number;
  lastSubmissionAt?: string;
  status: 'active' | 'archived';
}

interface InputFormField {
  type: string;
  label: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface FormSubmissionData {
  form_id: string;
  completed_at: string;
}

interface FormRecord {
  id: string;
  form_id: string;
  title: string;
  description: string;
  created_at: string;
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

function validateCreateFormRequest(
  tenantSlug: unknown,
  title: unknown
): { valid: true } | { valid: false; error: Response } {
  if (!tenantSlug) {
    return { valid: false, error: jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST) };
  }
  if (!title) {
    return { valid: false, error: jsonError('Form title is required', HTTP_STATUS.BAD_REQUEST) };
  }
  return { valid: true };
}

async function fetchFormsWithSubmissionStats(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantSlug: string
) {
  const { data: forms, error: formsError } = await supabase
    .from('peskids.forms')
    .select('id, form_id, title, description, status')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (formsError) {
    console.error('Failed to fetch forms:', formsError);
    return { ok: false as const, error: 'Failed to fetch forms' };
  }

  const formIds = forms?.map((f) => f.id) || [];
  const submissionCounts = new Map<string, number>();
  const lastSubmissions = new Map<string, string>();

  if (formIds.length > 0) {
    const { data: submissions, error: submissionsError } = await supabase
      .from('peskids.form_submissions')
      .select('form_id, completed_at')
      .eq('tenant_slug', tenantSlug)
      .in('form_id', formIds);

    if (!submissionsError && submissions) {
      (submissions as FormSubmissionData[]).forEach((sub) => {
        const count = submissionCounts.get(sub.form_id) || 0;
        submissionCounts.set(sub.form_id, count + 1);

        const lastSubmission = lastSubmissions.get(sub.form_id);
        if (!lastSubmission || (sub.completed_at && sub.completed_at > lastSubmission)) {
          lastSubmissions.set(sub.form_id, sub.completed_at);
        }
      });
    }
  }

  return {
    ok: true as const,
    forms,
    submissionCounts,
    lastSubmissions,
  };
}

async function createFormRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  formId: string,
  tenantSlug: string,
  title: string,
  description: string | undefined,
  status: string | undefined
) {
  const { data: form, error: formError } = await supabase
    .from('peskids.forms')
    .insert({
      form_id: formId,
      tenant_slug: tenantSlug,
      title,
      description: description || '',
      status: status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (formError) {
    console.error('Failed to create form:', formError);
    return { ok: false as const, error: 'Failed to create form' };
  }
  return { ok: true as const, form: form as FormRecord };
}

async function createFormFields(
  supabase: ReturnType<typeof getSupabaseClient>,
  formId: string,
  tenantSlug: string,
  fields: InputFormField[] | undefined
): Promise<void> {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return;
  }

  const fieldsData = fields.map((field: InputFormField, index: number) => ({
    form_id: formId,
    tenant_slug: tenantSlug,
    field_id: crypto.randomUUID(),
    field_type: field.type || 'text',
    label: field.label || '',
    required: field.required || false,
    order: index,
    options: field.options || null,
    created_at: new Date().toISOString(),
  }));

  const { error: fieldsError } = await supabase.from('peskids.form_fields').insert(fieldsData);

  if (fieldsError) {
    console.error('Failed to create form fields:', fieldsError);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  const { tenantSlug } = await params;
  return runTrustedPortalDalForPathSlug(
    request,
    tenantSlug,
    async () => {
      try {
        const supabase = getServiceClient();

        // Fetch forms for this tenant
        const { data: forms, error: formsError } = await supabase
          .schema('peskids').from('forms')
          .select('id, form_id, title, description, status')
          .eq('tenant_slug', tenantSlug)
          .order('created_at', { ascending: false });

        if (formsError) {
          console.error('Failed to fetch forms:', formsError);
          return jsonError('Failed to fetch forms', HTTP_STATUS.INTERNAL_ERROR);
        }

    const result = await fetchFormsWithSubmissionStats(supabase, tenantSlug);
    if (!result.ok) {
      return jsonError(result.error, HTTP_STATUS.INTERNAL_ERROR);
    }

    const formMetadata: FormMetadata[] = (result.forms || []).map((form) => ({
      formId: form.form_id,
      formTitle: form.title,
      description: form.description,
      submissionCount: result.submissionCounts.get(form.id) || 0,
      lastSubmissionAt: result.lastSubmissions.get(form.id),
      status: form.status,
    }));

    return jsonOk({ forms: formMetadata });
  } catch (error) {
    console.error('Forms endpoint error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  try {
    const { tenantSlug } = await params;
    const body = await request.json();
    const { title, description, fields, status } = body;

    const validation = validateCreateFormRequest(tenantSlug, title);
    if (!validation.valid) {
      return validation.error;
    }

    const supabase = getSupabaseClient();
    const formId = crypto.randomUUID();

    const formResult = await createFormRecord(
      supabase,
      formId,
      tenantSlug as string,
      title,
      description,
      status
    );
    if (!formResult.ok) {
      return jsonError(formResult.error, HTTP_STATUS.INTERNAL_ERROR);
    }

    await createFormFields(supabase, formId, tenantSlug as string, fields);

    return jsonOk({
      id: formResult.form.id,
      formId,
      title,
      description,
      status,
      createdAt: formResult.form.created_at,
    });
  } catch (error) {
    console.error('Form creation error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
