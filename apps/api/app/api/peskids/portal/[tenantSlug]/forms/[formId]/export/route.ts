import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '@/lib/constants';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

interface FormSubmission {
  submission_id: string;
  submission_data: Record<string, string | number | boolean | null>;
  completed_at: string;
  status: string;
  score: number | null;
  feedback: string | null;
}


function convertToCSV(submissions: FormSubmission[]): string {
  if (!submissions || submissions.length === 0) {
    return 'submission_id,completed_at,status,score,feedback\n';
  }

  // Get all unique field names from submission data
  const fieldNames = new Set<string>();
  submissions.forEach((sub) => {
    if (sub.submission_data) {
      Object.keys(sub.submission_data).forEach((key) => fieldNames.add(key));
    }
  });

  // Build header
  const header = [
    'submission_id',
    'completed_at',
    'status',
    'score',
    'feedback',
    ...Array.from(fieldNames),
  ];

  // Build rows
  const rows = submissions.map((sub) => {
    const row = [
      sub.submission_id,
      sub.completed_at,
      sub.status,
      sub.score ?? '',
      sub.feedback ?? '',
    ];

    // Add field values
    fieldNames.forEach((fieldName) => {
      const value = sub.submission_data?.[fieldName];
      if (value === null || value === undefined) {
        row.push('');
      } else {
        const stringValue = String(value).replace(/"/g, '""');
        row.push(`"${stringValue}"`);
      }
    });

    return row
      .map((cell) =>
        typeof cell === 'string' &&
        (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
          ? `"${cell}"`
          : cell
      )
      .join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; formId: string }> }
): Promise<Response> {
  const { tenantSlug, formId } = await params;

  return runTrustedPortalDalForPathSlug(
    request,
    tenantSlug,
    async (session) => {
      try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'csv';

        if (!tenantSlug || !formId) {
          return new Response('Missing tenant slug or form ID', {
            status: HTTP_STATUS.BAD_REQUEST,
          });
        }

        if (!['csv', 'json'].includes(format)) {
          return new Response('Invalid format. Use csv or json', {
            status: HTTP_STATUS.BAD_REQUEST,
          });
        }

        const supabase = getServiceClient();

        // Verify form exists
        const { data: form, error: formError } = await supabase
          .schema('peskids').from('forms')
          .select('id, title')
          .eq('form_id', formId)
          .eq('tenant_slug', tenantSlug)
          .single();

        if (formError || !form) {
          return new Response('Form not found', { status: HTTP_STATUS.NOT_FOUND });
        }

        // Get submissions
        const { data: submissions, error: submissionsError } = await supabase
          .schema('peskids').from('form_submissions')
          .select('submission_id, submission_data, completed_at, status, score, feedback')
          .eq('form_id', formId)
          .eq('tenant_slug', tenantSlug)
          .order('completed_at', { ascending: false });

        if (submissionsError) {
          console.error('Failed to fetch submissions:', submissionsError);
          return new Response('Failed to export submissions', {
            status: HTTP_STATUS.INTERNAL_ERROR,
          });
        }

        let content: string;
        let contentType: string;
        let filename: string;

        if (format === 'json') {
          content = JSON.stringify(submissions, null, 2);
          contentType = 'application/json';
          filename = `${form.title}-responses.json`;
        } else {
          content = convertToCSV(submissions || []);
          contentType = 'text/csv';
          filename = `${form.title}-responses.csv`;
        }

        // Log audit event
        try {
          await supabase.schema('peskids').rpc('log_audit_event', {
            p_action: 'form_submissions_exported',
            p_actor_id: session.user.id,
            p_tenant_slug: tenantSlug,
            p_resource_id: formId,
            p_resource_type: 'form',
            p_metadata: {
              format,
              count: submissions?.length || 0,
            },
          });
        } catch (auditError) {
          console.error('Failed to log audit event:', auditError);
        }

        return new Response(content, {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (error) {
        console.error('Export error:', error);
        return new Response('Internal server error', {
          status: HTTP_STATUS.INTERNAL_ERROR,
        });
      }
    },
    PORTAL_READ_ACCESS
  );
}
