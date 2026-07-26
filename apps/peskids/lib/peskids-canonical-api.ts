import { resolveAppOrigin } from '@/lib/app-url';
import { syncLeadToCrm } from '@/lib/peskids-crm-sync';

export const OPSLY_API_ORIGIN = resolveAppOrigin({
  envName: 'NEXT_PUBLIC_OPSLY_API_URL',
  localPort: 3000,
  prodSubdomain: 'api',
  prodFallback: 'https://api.op-sly.com',
});

const CANONICAL_GRADES = new Set(['K-5', '6-8', '9-12', 'Other']);

export type PeskidsLeadCaptureBody = {
  name: string;
  email: string;
  phone?: string;
  lead_type?: 'family' | 'teacher_applicant' | 'company';
  service_mode?: 'llanogrande' | 'domicilio' | 'institutional';
  class_modality?: 'llanogrande' | 'domicilio';
  neighborhood?: string;
  grade_interested: string;
  child_name?: string;
  birth_date?: string;
  document_type?: string;
  document_number?: string;
  company_name?: string;
  company_nit?: string;
  referral_source?: string;
};

export type CanonicalLeadResult =
  | {
      ok: true;
      leadId: string;
      tenantSlug: string;
      createdAt: string;
      ghlContactId?: string;
      twentyPersonId?: string;
      twentyOpportunityId?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function normalizeGrade(grade: string): 'K-5' | '6-8' | '9-12' | 'Other' {
  const trimmed = grade.trim();
  if (CANONICAL_GRADES.has(trimmed)) {
    return trimmed as 'K-5' | '6-8' | '9-12' | 'Other';
  }
  return 'Other';
}

function normalizeReferralSource(
  source: string | undefined
):
  | 'Facebook'
  | 'Instagram'
  | 'Website'
  | 'Referral'
  | 'Google'
  | 'Friend'
  | 'Other'
  | 'Not sure'
  | undefined {
  if (!source?.trim()) {
    return undefined;
  }
  const normalized = source.trim().toLowerCase();
  if (['instagram', 'ig', 'insta'].includes(normalized)) return 'Instagram';
  if (['facebook', 'fb', 'meta'].includes(normalized)) return 'Facebook';
  if (['website', 'web', 'site', 'direct', 'organic', 'search', 'google'].includes(normalized)) {
    return 'Website';
  }
  if (['referral', 'friend', 'referido', 'recommendation', 'recomendation'].includes(normalized)) {
    return 'Referral';
  }
  const allowed = [
    'Google',
    'Friend',
    'Facebook',
    'Instagram',
    'Website',
    'Referral',
    'Other',
    'Not sure',
  ] as const;
  const match = allowed.find((item) => item.toLowerCase() === normalized);
  return match ?? 'Other';
}

export function buildCanonicalLeadPayload(
  body: PeskidsLeadCaptureBody,
  crmIds?: {
    ghlContactId?: string;
    twentyPersonId?: string;
    twentyOpportunityId?: string;
  }
): Record<string, unknown> {
  return {
    tenant_slug: 'peskids',
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone?.trim() ?? '',
    lead_type: body.lead_type ?? 'family',
    service_mode:
      body.service_mode ??
      (body.lead_type === 'company' ? 'institutional' : (body.class_modality ?? 'llanogrande')),
    class_modality: body.class_modality ?? 'llanogrande',
    neighborhood: body.neighborhood?.trim() || 'Por confirmar',
    grade_interested: normalizeGrade(body.grade_interested),
    ...(body.child_name ? { child_name: body.child_name.trim() } : {}),
    ...(body.birth_date ? { birth_date: body.birth_date } : {}),
    ...(body.document_type ? { document_type: body.document_type.trim() } : {}),
    ...(body.document_number ? { document_number: body.document_number.trim() } : {}),
    ...(body.company_name ? { company_name: body.company_name.trim() } : {}),
    ...(body.company_nit ? { company_nit: body.company_nit.trim() } : {}),
    referral_source: normalizeReferralSource(body.referral_source),
    ...(crmIds?.ghlContactId ? { ghl_contact_id: crmIds.ghlContactId } : {}),
    ...(crmIds?.twentyPersonId ? { twenty_person_id: crmIds.twentyPersonId } : {}),
    ...(crmIds?.twentyOpportunityId ? { twenty_opportunity_id: crmIds.twentyOpportunityId } : {}),
  };
}

export async function postPeskidsCanonicalLead(
  body: PeskidsLeadCaptureBody,
  requestId: string,
  crmIds?: {
    ghlContactId?: string;
    twentyPersonId?: string;
    twentyOpportunityId?: string;
  }
): Promise<CanonicalLeadResult> {
  const url = `${OPSLY_API_ORIGIN}/api/public/tenants/peskids/leads`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify(buildCanonicalLeadPayload(body, crmIds)),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[peskids][lead] canonical API unreachable', { request_id: requestId, error });
    return { ok: false, status: 502, error: 'Lead service unavailable' };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === 'string'
        ? payload.error
        : `Lead service rejected request (${response.status})`;
    return { ok: false, status: response.status, error: errorMessage };
  }

  const leadId = typeof payload.lead_id === 'string' ? payload.lead_id : null;
  if (!leadId) {
    return { ok: false, status: 502, error: 'Lead service returned an invalid payload' };
  }

  return {
    ok: true,
    leadId,
    tenantSlug: typeof payload.tenant_slug === 'string' ? payload.tenant_slug : 'peskids',
    createdAt:
      typeof payload.created_at === 'string' ? payload.created_at : new Date().toISOString(),
    ghlContactId: crmIds?.ghlContactId,
    twentyPersonId: crmIds?.twentyPersonId,
    twentyOpportunityId: crmIds?.twentyOpportunityId,
  };
}

export async function postPeskidsLeadWithCRM(
  body: PeskidsLeadCaptureBody,
  requestId: string
): Promise<CanonicalLeadResult> {
  let crmIds: {
    ghlContactId?: string;
    twentyPersonId?: string;
    twentyOpportunityId?: string;
  } = {};

  try {
    const crmResult = await syncLeadToCrm({
      parentName: body.name,
      email: body.email,
      phone: body.phone,
      gradeInterested: body.grade_interested,
      source: body.referral_source || 'web',
    });
    crmIds = {
      ghlContactId: crmResult.ghlContactId,
      twentyPersonId: crmResult.twentyPersonId,
      twentyOpportunityId: crmResult.twentyOpportunityId,
    };
  } catch (err) {
    console.warn('[peskids][lead] CRM sync failed, continuing with canonical:', err);
  }

  return postPeskidsCanonicalLead(body, requestId, crmIds);
}

/** @deprecated Use postPeskidsLeadWithCRM — GHL now requires PESKIDS_GHL_ENABLED=true */
export async function postPeskidsLeadWithGHL(
  body: PeskidsLeadCaptureBody,
  requestId: string
): Promise<CanonicalLeadResult> {
  return postPeskidsLeadWithCRM(body, requestId);
}
