import { NextRequest } from 'next/server';
import { buildPeskidsReferralLink } from '@/lib/peskids-referral-links';
import { buildPeskidsReferralCode } from '@/lib/peskids-referrals';
import { postPeskidsLeadWithCRM } from '@/lib/peskids-canonical-api';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { leadApiPostSchema } from '@/lib/validation/lead.schema';
import { firstZodErrorMessage } from '@/lib/validation/zod-errors';
import { findLeadIdByEmail } from '@/lib/lead-intake-idempotency';

// FormData only carries strings/Files; the client serializes these booleans with String(value).
const BOOLEAN_FIELDS = new Set([
  'consent_treatment',
  'consent_identity_document',
  'consent_marketing',
  'consent_photos_videos',
]);

function coerceMultipartValue(key: string, value: string): unknown {
  return BOOLEAN_FIELDS.has(key) ? value === 'true' : value;
}

/** Reads JSON or multipart/form-data bodies; multipart is used when teacher-applicant files are attached. */
async function readLeadRequestBody(
  request: NextRequest
): Promise<{ raw: unknown; attachments: FormData | null } | { error: string }> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return { error: 'Invalid form data' };
    }
    const raw: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      raw[key] = coerceMultipartValue(key, value);
    }
    return { raw, attachments: formData };
  }

  try {
    const raw: unknown = await request.json();
    return { raw, attachments: null };
  } catch {
    return { error: 'Invalid JSON body' };
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const bodyResult = await readLeadRequestBody(request);
    if ('error' in bodyResult) {
      return errorJson(requestId, bodyResult.error, 400);
    }
    const { raw, attachments } = bodyResult;

    const parsed = leadApiPostSchema.safeParse(raw);

    if (!parsed.success) {
      return errorJson(requestId, firstZodErrorMessage(parsed.error), 400);
    }

    const body = parsed.data;
    const existingLeadId = await findLeadIdByEmail(body.email);
    if (existingLeadId) {
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
      const referralCode =
        body.referral_code?.trim().toUpperCase() ??
        buildPeskidsReferralCode({
          tenantId,
          leadId: existingLeadId,
          email: body.email,
        });
      return successJson(requestId, {
        ok: true,
        id: existingLeadId,
        lead_id: existingLeadId,
        tenant_slug: tenantId,
        lead_type: body.lead_type,
        referral_code: referralCode,
        referral_link: buildPeskidsReferralLink(referralCode),
        referral_discount_cents: 0,
        message: 'Interesado ya registrado',
        replayed: true,
      });
    }

    console.warn('[peskids][lead] consent', {
      treatment: body.consent_treatment,
      identity_document: body.consent_identity_document,
      marketing: body.consent_marketing,
      policy_version: body.consent_policy_version,
      lead_type: body.lead_type,
      request_id: requestId,
    });

    const canonical = await postPeskidsLeadWithCRM(
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        lead_type: body.lead_type,
        service_mode: body.service_mode,
        class_modality: body.class_modality,
        neighborhood: body.neighborhood,
        grade_interested: body.grade_interested,
        child_name: 'child_name' in body ? body.child_name : undefined,
        birth_date: 'birth_date' in body ? body.birth_date : undefined,
        document_type: 'document_type' in body ? body.document_type : undefined,
        document_number: 'document_number' in body ? body.document_number : undefined,
        company_name: 'company_name' in body ? body.company_name : undefined,
        company_nit: 'company_nit' in body ? body.company_nit : undefined,
        metadata: body.metadata,
        referral_source: body.referral_source,
      },
      requestId,
      attachments
    );

    if (!canonical.ok) {
      const status = canonical.status >= 400 && canonical.status < 600 ? canonical.status : 502;
      return errorJson(requestId, canonical.error, status);
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const referralCode =
      body.referral_code?.trim().toUpperCase() ??
      buildPeskidsReferralCode({
        tenantId,
        leadId: canonical.leadId,
        email: body.email,
      });
    const referralLink = buildPeskidsReferralLink(referralCode);

    return successJson(
      requestId,
      {
        ok: true,
        id: canonical.leadId,
        lead_id: canonical.leadId,
        tenant_slug: canonical.tenantSlug,
        lead_type: body.lead_type,
        referral_code: referralCode,
        referral_link: referralLink,
        referral_discount_cents: 0,
        message: 'Interesado registrado correctamente',
        twenty_person_id: canonical.twentyPersonId ?? null,
        twenty_opportunity_id: canonical.twentyOpportunityId ?? null,
      },
      201
    );
  } catch (error) {
    console.error('Peskids lead endpoint error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
