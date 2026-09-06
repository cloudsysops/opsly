import type { NextRequest } from 'next/server';
import { getServiceClient } from '../supabase';
import { extractIp, logAuditEvent } from '../audit';
import { HTTP_STATUS } from '../constants';
import { checkRateLimit } from '../rate-limiter';
import { assertPeskidsTenantPublic } from './assert-tenant';
import { PESKIDS_TEACHER_ATTACHMENTS_BUCKET, PESKIDS_TENANT_SLUG } from './constants';
import { dispatchPeskidsHotLeadAlert } from './hot-lead-alert';
import { dispatchPeskidsSupportWhatsAppAlert } from './support-whatsapp-alert';
import { dispatchPeskidsLeadConfirmationEmail } from './lead-confirmation-email';
import { dispatchPeskidsStaffLeadNotification } from './staff-notification-email';
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
          // Files are processed separately by uploadTeacherAttachments()
          continue;
        }
        // metadata travels as a JSON string over multipart (FormData has no object type)
        if (key === 'metadata') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            // leave as-is; schema validation will reject it
            data[key] = value;
          }
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
  const rawRecord =
    raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const attachmentsCandidate = rawRecord?._attachments;
  const attachments = attachmentsCandidate instanceof FormData ? attachmentsCandidate : null;
  const cleanedRaw =
    attachments && rawRecord
      ? Object.fromEntries(Object.entries(rawRecord).filter(([k]) => k !== '_attachments'))
      : raw;

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
  void dispatchPeskidsSupportWhatsAppAlert(row).catch((error: unknown) => {
    console.warn('[peskids] support WhatsApp alert failed', {
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
  void dispatchPeskidsStaffLeadNotification(row).catch((error: unknown) => {
    console.warn('[peskids] staff lead notification failed', {
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

type AttachmentSpec = {
  type: 'curriculum' | 'cedula_copy' | 'swimming_video';
  maxBytes: number;
  allowedMime: readonly string[];
};

const TEACHER_ATTACHMENT_SPECS: readonly AttachmentSpec[] = [
  {
    type: 'curriculum',
    maxBytes: 10 * 1024 * 1024,
    allowedMime: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    type: 'cedula_copy',
    maxBytes: 10 * 1024 * 1024,
    allowedMime: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    type: 'swimming_video',
    maxBytes: 100 * 1024 * 1024,
    allowedMime: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
  },
];

function fileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex) : '';
}

type UploadedAttachment = {
  storage_path: string;
  name: string;
  size: number;
  mime_type: string;
};

/** Uploads one attachment if present/valid; returns null when skipped (missing, too large, wrong type, or upload error). */
async function uploadSingleAttachment(
  client: ReturnType<typeof getServiceClient>,
  leadId: string,
  formData: FormData,
  spec: AttachmentSpec
): Promise<UploadedAttachment | null> {
  const file = formData.get(`file_${spec.type}`) as File | null;
  if (!file || file.size === 0) return null;

  if (file.size > spec.maxBytes) {
    console.warn(`[peskids] teacher attachment too large: ${spec.type}`, {
      lead_id: leadId,
      size: file.size,
      max: spec.maxBytes,
    });
    return null;
  }
  if (file.type && !spec.allowedMime.includes(file.type)) {
    console.warn(`[peskids] teacher attachment invalid mime type: ${spec.type}`, {
      lead_id: leadId,
      mime_type: file.type,
    });
    return null;
  }

  const storagePath = `${leadId}/${spec.type}${fileExtension(file.name)}`;
  const { error: uploadError } = await client.storage
    .from(PESKIDS_TEACHER_ATTACHMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    console.error(`[peskids] teacher attachment upload failed: ${spec.type}`, {
      lead_id: leadId,
      error: uploadError.message,
    });
    return null;
  }

  console.log(`[peskids] teacher attachment uploaded: ${spec.type}`, {
    lead_id: leadId,
    storage_path: storagePath,
  });

  return { storage_path: storagePath, name: file.name, size: file.size, mime_type: file.type };
}

async function saveAttachmentMetadata(
  client: ReturnType<typeof getServiceClient>,
  leadId: string,
  uploaded: Record<string, UploadedAttachment>
): Promise<void> {
  // Re-read metadata right before writing to shrink the race window against
  // the advisor-brief background job, which also does a read-then-replace update.
  const { data: current } = await client
    .schema('platform')
    .from('peskids_leads')
    .select('metadata')
    .eq('id', leadId)
    .single();
  const existingMetadata = (current?.metadata as Record<string, unknown> | null) ?? {};

  const updateResult = await peskidsUpdateLeadMetadata(leadId, {
    ...existingMetadata,
    attachments: uploaded,
  });
  if (!updateResult.ok) {
    console.error('[peskids] failed to save attachment metadata', {
      lead_id: leadId,
      error: updateResult.error,
    });
  }
}

/**
 * Upload teacher attachments (CV, ID copy, swimming video) to Supabase Storage
 * and record their storage paths on the lead's metadata.
 * Non-blocking operation - failures don't prevent lead creation.
 */
async function uploadTeacherAttachments(leadId: string, formData: FormData): Promise<void> {
  try {
    const client = getServiceClient();
    const uploaded: Record<string, UploadedAttachment> = {};

    for (const spec of TEACHER_ATTACHMENT_SPECS) {
      const result = await uploadSingleAttachment(client, leadId, formData, spec);
      if (result) {
        uploaded[spec.type] = result;
      }
    }

    if (Object.keys(uploaded).length > 0) {
      await saveAttachmentMetadata(client, leadId, uploaded);
    }
  } catch (error) {
    console.error('[peskids] Failed to process teacher attachments', {
      lead_id: leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-blocking - don't re-throw
  }
}
