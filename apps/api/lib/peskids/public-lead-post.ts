import type { NextRequest } from 'next/server';
import { extractIp, logAuditEvent } from '../audit';
import { HTTP_STATUS } from '../constants';
import { checkRateLimit } from '../rate-limiter';
import { assertPeskidsTenantPublic } from './assert-tenant';
import { PESKIDS_TENANT_SLUG } from './constants';
import { dispatchPeskidsHotLeadAlert } from './hot-lead-alert';
import { dispatchPeskidsLeadConfirmationEmail } from './lead-confirmation-email';
import { peskidsInsertLead, peskidsUpdateLeadMetadata } from './repository';
import { peskidsLeadBodySchema } from './schemas';
import { generateAdvisorBrief } from './advisor-brief-generator';

async function readBody(request: NextRequest): Promise<unknown | Response> {
  const contentType = request.headers.get('content-type') || '';

  // Handle FormData (multipart/form-data)
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const data: Record<string, unknown> = {};

      // Extract text fields
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Skip files for now - we'll process them separately
          continue;
        }
        data[key] = value;
      }

      // Store file references for later processing
      data._attachments = formData;

      return data;
    } catch {
      return Response.json({ error: 'Invalid form data' }, { status: HTTP_STATUS.BAD_REQUEST });
    }
  }

  // Handle JSON (default)
  try {
    return await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
}

/**
 * POST público: captura lead Peskids (sin JWT).
 * Side effects (hot-lead n8n, confirmation email) are fire-and-forget and flag-gated (default off).
 */
export async function postPublicPeskidsLead(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `peskids-lead:${ip}` : 'peskids-lead:anonymous');

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const gate = await assertPeskidsTenantPublic(PESKIDS_TENANT_SLUG);
  if (gate !== null) {
    return gate;
  }

  const raw = await readBody(request);
  if (raw instanceof Response) {
    return raw;
  }

  // Extract attachments before validation (not part of schema)
  const attachments = raw instanceof Object && '_attachments' in raw ? (raw as Record<string, unknown>)._attachments : null;
  const cleanedRaw = attachments ? Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([k]) => k !== '_attachments')
  ) : raw;

  const parsed = peskidsLeadBodySchema.safeParse(cleanedRaw);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const inserted = await peskidsInsertLead(parsed.data);
  if (!inserted.ok) {
    return Response.json({ error: inserted.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const row = inserted.row;

  void logAuditEvent({
    tenant_slug: row.tenant_slug,
    action: 'CREATE',
    resource: `peskids:lead:${row.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: {
      lead_id: row.id,
      referral_source: row.referral_source,
      event_type: 'lead.created',
    },
  });

  // Never block lead persistence on n8n/Discord/email outages.
  void dispatchPeskidsHotLeadAlert(row).catch((error: unknown) => {
    console.warn('[peskids] hot-lead alert dispatch failed', {
      lead_id: row.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  void dispatchPeskidsLeadConfirmationEmail(row).catch((error: unknown) => {
    console.warn('[peskids] lead confirmation email failed', {
      lead_id: row.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // Generate AI advisor brief (Priority 6 - non-blocking)
  void (async () => {
    try {
      const brief = await generateAdvisorBrief(row);
      if (brief) {
        await peskidsUpdateLeadMetadata(row.id, {
          ...(row.metadata ?? {}),
          advisor_brief: brief,
          brief_generated_at: new Date().toISOString(),
        });
        console.log('[peskids] advisor brief generated successfully', {
          lead_id: row.id,
          brief_length: brief.length,
        });
      }
    } catch (error) {
      console.warn('[peskids] advisor brief generation failed', {
        lead_id: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  // Process file uploads if present (teacher_applicant with attachments)
  if (attachments && parsed.data.lead_type === 'teacher_applicant') {
    void uploadTeacherAttachments(row.id, attachments as FormData).catch((error: unknown) => {
      console.warn('[peskids] teacher attachment upload failed', {
        lead_id: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return Response.json(
    {
      ok: true,
      lead_id: row.id,
      tenant_slug: row.tenant_slug,
      event_type: 'lead.created',
      created_at: row.created_at,
    },
    { status: HTTP_STATUS.CREATED }
  );
}

/**
 * Upload teacher attachments (CV, ID copy, swimming video) to Supabase Storage.
 * Non-blocking operation - failures don't prevent lead creation.
 */
async function uploadTeacherAttachments(leadId: string, formData: FormData): Promise<void> {
  try {
    const attachmentTypes = ['curriculum', 'cedula_copy', 'swimming_video'];

    for (const type of attachmentTypes) {
      const fileKey = `file_${type}`;
      const file = formData.get(fileKey) as File | null;

      if (!file) continue;

      // Note: Actual Supabase upload logic would go here
      // For now, we log that we received the file
      console.log(`[peskids] teacher attachment received: ${type}`, {
        lead_id: leadId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      });

      // TODO: Implement Supabase Storage upload and update lead metadata
      // const uploadedUrl = await uploadToSupabaseStorage(leadId, type, file);
      // await updateLeadAttachmentUrls(leadId, type, uploadedUrl);
    }
  } catch (error) {
    console.error('[peskids] Failed to process teacher attachments', {
      lead_id: leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-blocking - don't re-throw
  }
}
