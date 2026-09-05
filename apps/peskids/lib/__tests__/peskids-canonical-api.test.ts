import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCanonicalLeadPayload,
  postPeskidsCanonicalLead,
} from '../peskids-canonical-api';

describe('peskids-canonical-api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps lead fields to the Opsly public API contract', () => {
    expect(
      buildCanonicalLeadPayload({
        name: 'Ana',
        email: 'ana@example.com',
        grade_interested: '3A',
        phone: ' 300 ',
        referral_source: 'Referral',
      })
    ).toEqual({
      tenant_slug: 'peskids',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '300',
      lead_type: 'family',
      service_mode: 'llanogrande',
      class_modality: 'llanogrande',
      neighborhood: 'Llanogrande',
      grade_interested: 'Other',
      metadata: { intake_version: 'dynamic-intake-v1' },
      referral_source: 'Referral',
    });
  });

  it('normalizes legacy source labels to the commercial buckets', () => {
    expect(
      buildCanonicalLeadPayload({
        name: 'Ana',
        email: 'ana@example.com',
        grade_interested: '3A',
        referral_source: 'google',
      })
    ).toMatchObject({
      referral_source: 'Website',
    });
  });

  it('returns canonical lead metadata on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          lead_id: 'lead-99',
          tenant_slug: 'peskids',
          created_at: '2026-05-27T12:00:00.000Z',
        }),
        { status: 201 }
      )
    );

    const result = await postPeskidsCanonicalLead(
      {
        name: 'Ana',
        email: 'ana@example.com',
        grade_interested: 'K-5',
      },
      'req-canonical-1'
    );

    expect(result).toEqual({
      ok: true,
      leadId: 'lead-99',
      tenantSlug: 'peskids',
      createdAt: '2026-05-27T12:00:00.000Z',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/tenants/peskids/leads'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-request-id': 'req-canonical-1' }),
      })
    );
  });

  it('surfaces upstream validation errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
    );

    const result = await postPeskidsCanonicalLead(
      {
        name: 'Ana',
        email: 'bad',
        grade_interested: 'K-5',
      },
      'req-canonical-400'
    );

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: 'Invalid request body',
    });
  });
});
