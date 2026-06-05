import { resolveAppOrigin } from '@/lib/app-url';

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
  class_modality?: 'llanogrande' | 'domicilio';
  neighborhood?: string;
  grade_interested: string;
  referral_source?: string;
};

export type CanonicalLeadResult =
  | {
      ok: true;
      leadId: string;
      tenantSlug: string;
      createdAt: string;
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
  const allowed = ['Google', 'Friend', 'Facebook', 'Instagram', 'Website', 'Referral', 'Other', 'Not sure'] as const;
  const match = allowed.find((item) => item.toLowerCase() === normalized);
  return match ?? 'Other';
}

export function buildCanonicalLeadPayload(body: PeskidsLeadCaptureBody): Record<string, unknown> {
  return {
    tenant_slug: 'peskids',
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone?.trim() ?? '',
    class_modality: body.class_modality ?? 'llanogrande',
    neighborhood: body.neighborhood?.trim() || 'Por confirmar',
    grade_interested: normalizeGrade(body.grade_interested),
    referral_source: normalizeReferralSource(body.referral_source),
  };
}

export async function postPeskidsCanonicalLead(
  body: PeskidsLeadCaptureBody,
  requestId: string
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
      body: JSON.stringify(buildCanonicalLeadPayload(body)),
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
    createdAt: typeof payload.created_at === 'string' ? payload.created_at : new Date().toISOString(),
  };
}
