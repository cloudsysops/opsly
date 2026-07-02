import { afterEach, describe, expect, it, vi } from 'vitest';

const syncLeadToCrmMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/peskids-crm-sync', () => ({
  syncLeadToCrm: syncLeadToCrmMock,
}));

import { postPeskidsLeadWithCRM } from '@/lib/peskids-canonical-api';

describe('postPeskidsLeadWithCRM', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('forwards CRM ids when sync succeeds', async () => {
    syncLeadToCrmMock.mockResolvedValue({
      ghlContactId: 'ghl-123',
      twentyPersonId: 'person-1',
      twentyOpportunityId: 'opp-1',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          lead_id: 'lead-1',
          tenant_slug: 'peskids',
          created_at: '2026-06-17T00:00:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await postPeskidsLeadWithCRM(
      {
        name: 'Parent Test',
        email: 'parent@example.com',
        grade_interested: '5-7',
        referral_source: 'production-audit',
      },
      'req-1'
    );

    expect(result.ok).toBe(true);
    expect(syncLeadToCrmMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.ghl_contact_id).toBe('ghl-123');
    expect(body.twenty_person_id).toBe('person-1');
    expect(body.twenty_opportunity_id).toBe('opp-1');
  });

  it('still creates canonical lead when CRM sync returns empty', async () => {
    syncLeadToCrmMock.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          lead_id: 'lead-2',
          tenant_slug: 'peskids',
          created_at: '2026-06-17T00:00:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await postPeskidsLeadWithCRM(
      {
        name: 'Parent Test',
        email: 'parent@example.com',
        grade_interested: '5-7',
      },
      'req-2'
    );

    expect(result.ok).toBe(true);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.ghl_contact_id).toBeUndefined();
    expect(body.twenty_person_id).toBeUndefined();
  });
});
