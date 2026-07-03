import { NextRequest } from 'next/server';
import { buildPeskidsReferralLink } from '@/lib/peskids-referral-links';
import { buildPeskidsReferralCode } from '@/lib/peskids-referrals';
import { postPeskidsLeadWithCRM } from '@/lib/peskids-canonical-api';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

type LeadBody = {
  name: string;
  email: string;
  phone?: string;
  class_modality?: 'llanogrande' | 'domicilio';
  neighborhood?: string;
  grade_interested: string;
  referral_source?: string;
  referral_code?: string;
  referred_by_code?: string;
  consent_treatment?: boolean;
  consent_marketing?: boolean;
  consent_policy_version?: string;
};

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const body = (await request.json()) as LeadBody;

    if (!body.consent_treatment) {
      return errorJson(requestId, 'Consent required', 400);
    }

    console.warn('[peskids][lead] consent', {
      treatment: body.consent_treatment,
      marketing: body.consent_marketing ?? false,
      policy_version: body.consent_policy_version,
      request_id: requestId,
    });

    const canonical = await postPeskidsLeadWithCRM(
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        class_modality: body.class_modality,
        neighborhood: body.neighborhood,
        grade_interested: body.grade_interested,
        referral_source: body.referral_source,
      },
      requestId
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
        referral_code: referralCode,
        referral_link: referralLink,
        referral_discount_cents: 0,
        message: 'Interesado registrado correctamente',
        ghl_contact_id: canonical.ghlContactId ?? null,
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
