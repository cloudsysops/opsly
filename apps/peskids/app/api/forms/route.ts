import { type NextRequest, NextResponse } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

interface InputFormField {
  type: string;
  label: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const body = await req.json();
    const { title, description, fields, status } = body;

    if (!title) {
      return errorJson(requestId, 'Form title is required', 400);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return errorJson(requestId, 'Server configuration error', 500);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRole);
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const formId = crypto.randomUUID();

    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({
        form_id: formId,
        tenant_slug: tenantSlug,
        title,
        description: description || '',
        status: status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (formError) {
      console.error('Failed to create form:', formError);
      return errorJson(requestId, 'Failed to create form', 500);
    }

    if (fields && Array.isArray(fields) && fields.length > 0) {
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

      const { error: fieldsError } = await supabase.from('form_fields').insert(fieldsData);

      if (fieldsError) {
        console.error('Failed to create form fields:', fieldsError);
      }
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'form_created',
        p_actor_id: auth.user?.id || 'staff',
        p_tenant_slug: tenantSlug,
        p_resource_id: formId,
        p_resource_type: 'form',
        p_metadata: { title, fields_count: fields?.length || 0 },
      });
    } catch {
      // audit log is non-critical
    }

    return successJson(requestId, {
      id: form.id,
      formId,
      title,
      description,
      status,
      createdAt: form.created_at,
    });
  } catch (error) {
    console.error('Form creation error:', error);
    return errorJson(requestId, 'Internal server error', 500);
  }
}
