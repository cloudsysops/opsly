import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '@/lib/constants';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

// peskids.* tables pending DB type codegen
interface PeskidsQB {
  select(cols?: string, opts?: Record<string, unknown>): PeskidsQB;
  eq(col: string, val: unknown): PeskidsQB;
  order(col: string, opts?: unknown): PeskidsQB;
  single(): Promise<{ data: unknown | null; error: unknown }>;
  then<T>(r: (v: { data: unknown[] | null; error: unknown }) => T, j?: (e: unknown) => T): Promise<T>;
}
interface PeskidsClient {
  from(table: string): PeskidsQB;
  rpc(fn: string, params: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

interface FormSubmission {
  submission_id: string;
  submission_data: Record<string, string | number | boolean | null>;
  completed_at: string;
  status: string;
  score: number | null;
  feedback: string | null;
}

interface ExportContent {
  content: string;
  contentType: string;
  filename: string;
}

function validateExportRequest(
  tenantSlug: unknown,
  formId: unknown,
  format: unknown
): { valid: true } | { valid: false; error: Response } {
  if (!tenantSlug || !formId) {
    return {
      valid: false,
      error: new Response('Missing tenant slug or form ID', {
        status: HTTP_STATUS.BAD_REQUEST,
      }),
    };
  }
  if (!['csv', 'json'].includes(format as string)) {
    return {
      valid: false,
      error: new Response('Invalid format. Use csv or json', {
        status: HTTP_STATUS.BAD_REQUEST,
      }),
    };
  }
  return { valid: true };
}

async function fetchFormForExport(
  supabase: ReturnType<typeof getServiceClient>,
  formId: string,
  tenantSlug: string
) {
  const db = supabase as unknown as PeskidsClient;
  const { data: rawForm, error: formError } = await db.from('peskids.forms').select('id, title').eq('form_id', formId).eq('tenant_slug', tenantSlug).single();
  type FormRow = { id: string; title: string };
  const form = rawForm as FormRow | null;

  if (formError || !form) {
    return { ok: false as const, error: 'Form not found' };
  }
  return { ok: true as const, form };
}

async function fetchFormSubmissions(
  supabase: ReturnType<typeof getServiceClient>,
  formId: string,
  tenantSlug: string
) {
  const db = supabase as unknown as PeskidsClient;
  const { data: rawSubs, error: submissionsError } = await db.from('peskids.form_submissions').select('submission_id, submission_data, completed_at, status, score, feedback').eq('form_id', formId).eq('tenant_slug', tenantSlug).order('completed_at', { ascending: false });
  const submissions = rawSubs as FormSubmission[] | null;

  if (submissionsError) {
    console.error('Failed to fetch submissions:', submissionsError);
    return { ok: false as const, error: 'Failed to export submissions' };
  }
  return { ok: true as const, submissions: submissions || [] };
}

function convertToCSV(submissions: FormSubmission[]): string {
  if (!submissions || submissions.length === 0) {
    return 'submission_id,completed_at,status,score,feedback\n';
  }

  const fieldNames = new Set<string>();
  submissions.forEach((sub) => {
    if (sub.submission_data) {
      Object.keys(sub.submission_data).forEach((key) => fieldNames.add(key));
    }
  });

  const header = [
    'submission_id',
    'completed_at',
    'status',
    'score',
    'feedback',
    ...Array.from(fieldNames),
  ];

  const rows = submissions.map((sub) => {
    const row = [
      sub.submission_id,
      sub.completed_at,
      sub.status,
      sub.score ?? '',
      sub.feedback ?? '',
    ];

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

function buildExportContent(
  format: string,
  submissions: FormSubmission[],
  formTitle: string
): ExportContent {
  if (format === 'json') {
    return {
      content: JSON.stringify(submissions, null, 2),
      contentType: 'application/json',
      filename: `${formTitle}-responses.json`,
    };
  }
  return {
    content: convertToCSV(submissions),
    contentType: 'text/csv',
    filename: `${formTitle}-responses.csv`,
  };
}

async function logExportAuditEvent(
  supabase: ReturnType<typeof getServiceClient>,
  format: string,
  tenantSlug: string,
  formId: string,
  count: number,
  actorId: string
): Promise<void> {
  try {
    const db = supabase as unknown as PeskidsClient;
    await db.rpc('log_audit_event', {
      p_action: 'form_submissions_exported',
      p_actor_id: actorId,
      p_tenant_slug: tenantSlug,
      p_resource_id: formId,
      p_resource_type: 'form',
      p_metadata: { format, count },
    });
  } catch (auditError) {
    console.error('Failed to log audit event:', auditError);
  }
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
      const format = request.nextUrl.searchParams.get('format') ?? 'csv';
      const supabase = getServiceClient();
      try {
        const validation = validateExportRequest(tenantSlug, formId, format);
        if (!validation.valid) {
          return validation.error;
        }

        const formResult = await fetchFormForExport(supabase, formId as string, tenantSlug as string);
        if (!formResult.ok) {
          return new Response(formResult.error, { status: HTTP_STATUS.NOT_FOUND });
        }

        const submissionsResult = await fetchFormSubmissions(
          supabase,
          formId as string,
          tenantSlug as string
        );
        if (!submissionsResult.ok) {
          return new Response(submissionsResult.error, { status: HTTP_STATUS.INTERNAL_ERROR });
        }

        const exportContent = buildExportContent(
          format as string,
          submissionsResult.submissions,
          formResult.form.title
        );

        await logExportAuditEvent(
          supabase,
          format as string,
          tenantSlug as string,
          formId as string,
          submissionsResult.submissions.length,
          session.user.id
        );
        return new Response(exportContent.content, {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': exportContent.contentType,
            'Content-Disposition': `attachment; filename="${exportContent.filename}"`,
          },
        });
      } catch (error) {
        console.error('Export error:', error);
        return new Response('Internal server error', { status: HTTP_STATUS.INTERNAL_ERROR });
      }
    },
    PORTAL_READ_ACCESS
  );
}
