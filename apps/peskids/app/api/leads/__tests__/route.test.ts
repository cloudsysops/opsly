import { beforeEach, describe, expect, it, vi } from 'vitest';

const postCanonicalLeadMock = vi.fn();
const buildReferralCodeMock = vi.fn();
const buildReferralLinkMock = vi.fn();
const findLeadIdByEmailMock = vi.fn();

vi.mock('@/lib/peskids-canonical-api', () => ({
  postPeskidsLeadWithCRM: postCanonicalLeadMock,
}));

vi.mock('@/lib/lead-intake-idempotency', () => ({
  findLeadIdByEmail: findLeadIdByEmailMock,
}));

vi.mock('@/lib/peskids-referrals', () => ({
  buildPeskidsReferralCode: buildReferralCodeMock,
  PESKIDS_REFERRAL_DISCOUNT_CENTS: 1000,
}));

vi.mock('@/lib/peskids-referral-links', () => ({
  buildPeskidsReferralLink: buildReferralLinkMock,
}));

describe('POST /api/leads', () => {
  beforeEach(() => {
    postCanonicalLeadMock.mockReset();
    buildReferralCodeMock.mockReset();
    buildReferralLinkMock.mockReset();
    findLeadIdByEmailMock.mockReset();
    findLeadIdByEmailMock.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('rejects requests without consent before touching the canonical API', async () => {
    const { POST } = await import('../route');

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-lead-400' }),
      json: async () => ({
        name: 'Ana López',
        email: 'ana@example.com',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
        grade_interested: 'K-5',
        consent_treatment: false,
      }),
    } as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      request_id: 'req-lead-400',
    });
    expect(typeof body.error).toBe('string');
    expect(postCanonicalLeadMock).not.toHaveBeenCalled();
  });

  it('proxies lead creation to the canonical public API', async () => {
    postCanonicalLeadMock.mockResolvedValue({
      ok: true,
      leadId: 'lead-1',
      tenantSlug: 'peskids',
      createdAt: '2026-05-27T12:00:00.000Z',
    });
    buildReferralCodeMock.mockReturnValue('PK-CODE');
    buildReferralLinkMock.mockReturnValue('https://peskids.op-sly.com/familias?ref=PK-CODE');

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-lead-201' }),
      json: async () => ({
        lead_type: 'family',
        name: 'Ana López',
        email: 'ana@example.com',
        phone: ' 3001234567 ',
        child_name: 'Mateo López',
        birth_date: '2018-05-10',
        document_number: '1234567890',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
        grade_interested: 'K-5',
        consent_treatment: true,
        consent_identity_document: true,
        referred_by_code: ' abc123 ',
      }),
    } as never);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      id: 'lead-1',
      lead_id: 'lead-1',
      tenant_slug: 'peskids',
      lead_type: 'family',
      referral_code: 'PK-CODE',
      referral_link: 'https://peskids.op-sly.com/familias?ref=PK-CODE',
      referral_discount_cents: 0,
      message: 'Interesado registrado correctamente',
      twenty_person_id: null,
      twenty_opportunity_id: null,
      request_id: 'req-lead-201',
    });
    expect(postCanonicalLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ana López',
        email: 'ana@example.com',
        phone: '3001234567',
        lead_type: 'family',
        grade_interested: 'K-5',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
      }),
      'req-lead-201',
      null
    );
    expect(buildReferralCodeMock).toHaveBeenCalledWith({
      tenantId: 'peskids',
      leadId: 'lead-1',
      email: 'ana@example.com',
    });
  });

  it('returns upstream canonical API failures', async () => {
    postCanonicalLeadMock.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'Lead service unavailable',
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-lead-502' }),
      json: async () => ({
        lead_type: 'family',
        name: 'Ana López',
        email: 'ana@example.com',
        phone: '3001234567',
        child_name: 'Mateo López',
        birth_date: '2018-05-10',
        document_number: '1234567890',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
        grade_interested: 'K-5',
        consent_treatment: true,
        consent_identity_document: true,
      }),
    } as never);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Lead service unavailable',
      request_id: 'req-lead-502',
    });
  });
});
