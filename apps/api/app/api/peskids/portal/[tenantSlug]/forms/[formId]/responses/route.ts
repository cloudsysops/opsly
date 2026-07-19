import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

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

        // Verify form exists and belongs to tenant
        const { data: form, error: formError } = await supabase
          .schema('peskids').from('forms')
          .select('id')
          .eq('form_id', formId)
          .eq('tenant_slug', tenantSlug)
          .single();

        if (formError || !form) {
          return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
        }

        // Get form submissions
        const { data: submissions, error: submissionsError } = await supabase
          .schema('peskids').from('form_submissions')
          .select('submission_id, submission_data, completed_at')
          .eq('form_id', formId)
          .eq('tenant_slug', tenantSlug)
          .order('completed_at', { ascending: false });

        if (submissionsError) {
          console.error('Failed to fetch submissions:', submissionsError);
          return jsonError('Failed to fetch responses', HTTP_STATUS.INTERNAL_ERROR);
        }

        const responses = (submissions || []).map((sub) => ({
          submissionId: sub.submission_id,
          completedAt: sub.completed_at,
          data: sub.submission_data,
        }));

        return jsonOk({
          formId,
          responses,
          count: responses.length,
        });
      } catch (error) {
        console.error('Form responses error:', error);
        return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
      }
    },
    PORTAL_READ_ACCESS
  );
}
