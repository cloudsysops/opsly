import { NextRequest } from 'next/server';
import { buildPeskidsReferralLink } from '@/lib/peskids-referral-links';
import { buildPeskidsReferralCode } from '@/lib/peskids-referrals';
import { postPeskidsLeadWithCRM } from '@/lib/peskids-canonical-api';
import {
  errorJson,
  internalErrorJson,
  resolveRequestId,
  successJson,
} from '@/lib/api-response';
import { intakeIdempotencyKey, lookupIntake, rememberIntake } from '@/lib/intake-idempotency';
import { getClientIdentifier, rateLimit } from '@/lib/rate-limit';
import { currentEnvironment } from '@/lib/runtime/environment';
import { leadApiPostSchema } from '@/lib/validation/lead.schema';
import { firstZodErrorMessage } from '@/lib/validation/zod-errors';
import { findLeadIdByEmail } from '@/lib/lead-intake-idempotency';

/** The browser's address, as a value safe to pass upstream as X-Forwarded-For. */
function clientForwardedFor(headers: Headers): string | null {
  const candidate =
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    null;
  if (!candidate) return null;
  // Only pass through something that looks like an address, so a hostile header
  // cannot inject arbitrary content into the upstream request.
  return /^[0-9a-fA-F:.]{3,45}$/.test(candidate) ? candidate : null;
}

// FormData only carries strings/Files; the client serializes these booleans with String(value).
const BOOLEAN_FIELDS = new Set([
  'consent_treatment',
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
    // This is the app's only fully public write. It had no rate limit at all:
    // the upstream limiter in apps/api keys on the caller IP, which — because
    // this proxy did not forward the browser's address — was the peskids server
    // for every lead in the world, i.e. one shared bucket.
    const clientId = getClientIdentifier(request.headers);
    if (!rateLimit(`lead-intake:${clientId}`, 10, 10 * 60 * 1000)) {
      console.warn(
        JSON.stringify({
          component: 'peskids.lead',
          event: 'intake_rate_limited',
          request_id: requestId,
        })
      );
      return errorJson(requestId, 'Too many requests', 429);
    }

    const bodyResult = await readLeadRequestBody(request);
    if ('error' in bodyResult) {
      return errorJson(requestId, bodyResult.error, 400);
    }
    const { raw, attachments } = bodyResult;

    const parsed = leadApiPostSchema.safeParse(raw);

    if (!parsed.success) {
      return errorJson(requestId, firstZodErrorMessage(parsed.error), 400, 'VALIDATION_ERROR');
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

    // Consent is an audit record, so it is logged structurally — with the
    // request id and NOT with the person's name, email or phone.
    console.info(
      JSON.stringify({
        component: 'peskids.lead',
        event: 'consent_recorded',
        request_id: requestId,
        environment: currentEnvironment(),
        tenant_slug: process.env.NEXT_PUBLIC_TENANT_ID || 'peskids',
        source: 'web_form',
        consent_treatment: body.consent_treatment,
        consent_marketing: body.consent_marketing,
        consent_policy_version: body.consent_policy_version,
        lead_type: body.lead_type,
      })
    );

    // Duplicate suppression: a double-click or a client retry must not create a
    // second lead, a second CRM person and a second hot-lead alert.
    const idempotencyKey = intakeIdempotencyKey({
      explicitKey: request.headers.get('idempotency-key'),
      leadType: body.lead_type,
      email: body.email,
      phone: body.phone,
    });

    if (idempotencyKey) {
      const previous = lookupIntake(idempotencyKey);
      if (previous) {
        console.info(
          JSON.stringify({
            component: 'peskids.lead',
            event: 'intake_duplicate_suppressed',
            request_id: requestId,
            lead_id: previous.leadId,
          })
        );
        return successJson(requestId, { ...previous.body, duplicate: true }, 200);
      }
    }

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
      attachments,
      // Forward the real client address so the upstream per-IP limiter in
      // apps/api applies to the browser, not to this server.
      { forwardedFor: clientForwardedFor(request.headers) }
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

    const responseBody = {
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
    };

    if (idempotencyKey) {
      rememberIntake(idempotencyKey, { leadId: canonical.leadId, body: responseBody });
    }

    // One traceable line per accepted lead: request_id ties the browser request,
    // the canonical API call and the CRM sync together.
    console.info(
      JSON.stringify({
        component: 'peskids.lead',
        event: 'lead.created',
        request_id: requestId,
        environment: currentEnvironment(),
        tenant_slug: canonical.tenantSlug,
        lead_id: canonical.leadId,
        lead_type: body.lead_type,
        source: 'web_form',
        twenty_person_id: canonical.twentyPersonId ?? null,
        created_at: canonical.createdAt,
      })
    );

    return successJson(requestId, responseBody, 201);
  } catch (error) {
    return internalErrorJson(requestId, 'POST /api/leads', error, 'Internal server error', 500);
  }
}
