import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIntakeIdempotencyCache } from '@/lib/intake-idempotency';
import { resetRateLimit } from '@/lib/rate-limit';

const postCanonicalLeadMock = vi.fn();
const buildReferralCodeMock = vi.fn();
const buildReferralLinkMock = vi.fn();
const findLeadIdByEmailMock = vi.fn();

vi.mock('@/lib/peskids-canonical-api', () => ({
  postPeskidsLeadWithCRM: postCanonicalLeadMock,
}));

// Supabase-backed duplicate-email lookup: not what this file's idempotency
// tests exercise (that's the in-memory intake-idempotency cache below), so it
// defaults to "no existing lead" and is stubbed out to avoid a real DB call.
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

let emailCounter = 0;
/** Distinct per test so the intake idempotency cache does not couple them. */
function uniqueEmail(): string {
  emailCounter += 1;
  return `ana${emailCounter}@example.com`;
}

function leadBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Ana López',
    email: uniqueEmail(),
    phone: '3001234567',
    class_modality: 'llanogrande',
    neighborhood: 'Llanogrande',
    grade_interested: 'K-5',
    consent_treatment: true,
    ...overrides,
  };
}

/**
 * The real Headers class rejects values containing CRLF at construction
 * time, which would make it impossible to test that the route itself drops
 * a header-injection attempt - the malicious value would never reach the
 * handler. This minimal stand-in accepts any string value so those tests
 * can actually exercise the sanitization logic.
 */
function mockHeaders(values: Record<string, string>) {
  const lower = new Map(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

function request(body: Record<string, unknown>, requestId: string, headers: Record<string, string> = {}) {
  return {
    headers: mockHeaders({ 'x-request-id': requestId, ...headers }),
    json: async () => body,
  } as never;
}

describe('POST /api/leads', () => {
  beforeEach(() => {
    postCanonicalLeadMock.mockReset();
    buildReferralCodeMock.mockReset();
    buildReferralLinkMock.mockReset();
    findLeadIdByEmailMock.mockReset();
    findLeadIdByEmailMock.mockResolvedValue(null);
    resetIntakeIdempotencyCache();
    resetRateLimit();
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('rejects requests without consent before touching the canonical API', async () => {
    const { POST } = await import('../route');

    const response = await POST(
      request(leadBody({ consent_treatment: false, phone: undefined }), 'req-lead-400')
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, request_id: 'req-lead-400' });
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

    const body = leadBody({ phone: ' 3001234567 ', referred_by_code: ' abc123 ' });
    const { POST } = await import('../route');
    const response = await POST(request(body, 'req-lead-201'));

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
        email: body.email,
        phone: '3001234567',
        lead_type: 'family',
        grade_interested: 'K-5',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
      }),
      'req-lead-201',
      null,
      expect.objectContaining({ forwardedFor: null })
    );
    expect(buildReferralCodeMock).toHaveBeenCalledWith({
      tenantId: 'peskids',
      leadId: 'lead-1',
      email: body.email,
    });
  });

  it('forwards the browser address so the upstream per-IP limit is meaningful', async () => {
    postCanonicalLeadMock.mockResolvedValue({
      ok: true,
      leadId: 'lead-ip',
      tenantSlug: 'peskids',
      createdAt: '2026-05-27T12:00:00.000Z',
    });
    buildReferralCodeMock.mockReturnValue('PK-CODE');
    buildReferralLinkMock.mockReturnValue('link');

    const { POST } = await import('../route');
    await POST(
      request(leadBody(), 'req-lead-ip', { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })
    );

    expect(postCanonicalLeadMock).toHaveBeenCalledWith(
      expect.anything(),
      'req-lead-ip',
      null,
      { forwardedFor: '203.0.113.7' }
    );
  });

  it('drops a non-address value in x-forwarded-for instead of passing it upstream', async () => {
    postCanonicalLeadMock.mockResolvedValue({
      ok: true,
      leadId: 'lead-bad-ip',
      tenantSlug: 'peskids',
      createdAt: '2026-05-27T12:00:00.000Z',
    });
    buildReferralCodeMock.mockReturnValue('PK-CODE');
    buildReferralLinkMock.mockReturnValue('link');

    const { POST } = await import('../route');
    await POST(
      request(leadBody(), 'req-lead-bad-ip', { 'x-forwarded-for': 'evil\r\nX-Admin: 1' })
    );

    expect(postCanonicalLeadMock).toHaveBeenCalledWith(
      expect.anything(),
      'req-lead-bad-ip',
      null,
      { forwardedFor: null }
    );
  });

  it('returns upstream canonical API failures', async () => {
    postCanonicalLeadMock.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'Lead service unavailable',
    });

    const { POST } = await import('../route');
    const response = await POST(request(leadBody(), 'req-lead-502'));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Lead service unavailable',
      request_id: 'req-lead-502',
    });
  });

  describe('idempotency', () => {
    beforeEach(() => {
      postCanonicalLeadMock.mockResolvedValue({
        ok: true,
        leadId: 'lead-dupe',
        tenantSlug: 'peskids',
        createdAt: '2026-05-27T12:00:00.000Z',
      });
      buildReferralCodeMock.mockReturnValue('PK-CODE');
      buildReferralLinkMock.mockReturnValue('link');
    });

    it('DUPLICATE SUBMISSION: the same form twice creates one lead', async () => {
      const body = leadBody();
      const { POST } = await import('../route');

      const first = await POST(request(body, 'req-dupe-1'));
      const second = await POST(request(body, 'req-dupe-2'));

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);

      const firstJson = await first.json();
      const secondJson = await second.json();
      expect(secondJson.lead_id).toBe(firstJson.lead_id);
      expect(secondJson.duplicate).toBe(true);

      // The single assertion that matters: the canonical API (and therefore the
      // CRM sync and the hot-lead alert) ran exactly once.
      expect(postCanonicalLeadMock).toHaveBeenCalledTimes(1);
    });

    it('honours an explicit Idempotency-Key even when the payload differs', async () => {
      const { POST } = await import('../route');
      const key = 'form-submit-01HYX000';

      const first = await POST(request(leadBody(), 'req-key-1', { 'idempotency-key': key }));
      const second = await POST(
        request(leadBody({ name: 'Ana Lopez' }), 'req-key-2', { 'idempotency-key': key })
      );

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(postCanonicalLeadMock).toHaveBeenCalledTimes(1);
    });

    it('treats a genuinely different family as a new lead', async () => {
      const { POST } = await import('../route');

      await POST(request(leadBody(), 'req-a'));
      await POST(request(leadBody(), 'req-b'));

      expect(postCanonicalLeadMock).toHaveBeenCalledTimes(2);
    });

    it('does not cache a failed submission', async () => {
      postCanonicalLeadMock.mockResolvedValueOnce({
        ok: false,
        status: 502,
        error: 'Lead service unavailable',
      });

      const body = leadBody();
      const { POST } = await import('../route');

      const failed = await POST(request(body, 'req-fail'));
      expect(failed.status).toBe(502);

      const retried = await POST(request(body, 'req-retry'));
      expect(retried.status).toBe(201);
      expect(postCanonicalLeadMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('rate limiting', () => {
    it('refuses a flood of submissions from one client', async () => {
      postCanonicalLeadMock.mockResolvedValue({
        ok: true,
        leadId: 'lead-flood',
        tenantSlug: 'peskids',
        createdAt: '2026-05-27T12:00:00.000Z',
      });
      buildReferralCodeMock.mockReturnValue('PK-CODE');
      buildReferralLinkMock.mockReturnValue('link');

      const { POST } = await import('../route');
      const headers = { 'x-forwarded-for': '198.51.100.42' };

      const statuses: number[] = [];
      for (let i = 0; i < 12; i += 1) {
        const response = await POST(request(leadBody(), `req-flood-${i}`, headers));
        statuses.push(response.status);
      }

      expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);
    });
  });
});
