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

        // Count submissions for each form
        const formIds = forms?.map((f) => f.id) || [];
        const submissionCounts = new Map<string, number>();
        const lastSubmissions = new Map<string, string>();

        if (formIds.length > 0) {
          const { data: submissions, error: submissionsError } = await supabase
            .schema('peskids').from('form_submissions')
            .select('form_id, completed_at')
            .eq('tenant_slug', tenantSlug)
            .in('form_id', formIds);

          if (!submissionsError && submissions) {
            submissions.forEach((sub) => {
              const count = submissionCounts.get(sub.form_id) || 0;
              submissionCounts.set(sub.form_id, count + 1);

              const lastSubmission = lastSubmissions.get(sub.form_id);
              if (!lastSubmission || (sub.completed_at && sub.completed_at > lastSubmission)) {
                lastSubmissions.set(sub.form_id, sub.completed_at || '');
              }
            });
          }
        }

        // Map to FormMetadata
        const formMetadata: FormMetadata[] = (forms || []).map((form) => ({
          formId: form.form_id,
          formTitle: form.title,
          description: form.description,
          submissionCount: submissionCounts.get(form.id) || 0,
          lastSubmissionAt: lastSubmissions.get(form.id),
          status: form.status,
        }));

        return jsonOk({
          forms: formMetadata,
        });
      } catch (error) {
        console.error('Forms endpoint error:', error);
        return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
      }
    },
    PORTAL_READ_ACCESS
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  const { tenantSlug } = await params;
  return runTrustedPortalDalForPathSlug(request, tenantSlug, async (session) => {
    try {
      const body = await request.json();
      const { title, description, fields, status } = body;

      if (!title) {
        return jsonError('Form title is required', HTTP_STATUS.BAD_REQUEST);
      }

      const supabase = getServiceClient();
      const formId = crypto.randomUUID();

      // Create form
      const { data: form, error: formError } = await supabase
        .schema('peskids').from('forms')
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
        return jsonError('Failed to create form', HTTP_STATUS.INTERNAL_ERROR);
      }

      // Insert form fields if provided
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

        const { error: fieldsError } = await supabase
          .schema('peskids').from('form_fields')
          .insert(fieldsData);

        if (fieldsError) {
          console.error('Failed to create form fields:', fieldsError);
          // Continue - form was created, just fields failed
        }
      }

      // Log audit event
      try {
        await supabase.schema('peskids').rpc('log_audit_event', {
          p_action: 'form_created',
          p_actor_id: session.user.id,
          p_tenant_slug: tenantSlug,
          p_resource_id: formId,
          p_resource_type: 'form',
          p_metadata: {
            title,
            fields_count: fields?.length || 0,
          },
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }

      return jsonOk({
        id: form.id,
        formId,
        title,
        description,
        status,
        createdAt: form.created_at,
      });
    } catch (error) {
      console.error('Form creation error:', error);
      return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
    }
  });
}
