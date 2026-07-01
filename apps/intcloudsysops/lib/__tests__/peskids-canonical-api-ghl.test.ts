import { afterEach, describe, expect, it, vi } from 'vitest';

const sendLeadToGHLMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/gohighlevel-lead-sync', () => ({
  sendLeadToGHL: sendLeadToGHLMock,
}));

import { postPeskidsLeadWithGHL } from '@/lib/peskids-canonical-api';

describe('postPeskidsLeadWithGHL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('forwards ghl_contact_id when GHL sync succeeds', async () => {
    sendLeadToGHLMock.mockResolvedValue({ ghlContactId: 'ghl-123' });
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

    const result = await postPeskidsLeadWithGHL(
      {
        name: 'Parent Test',
        email: 'parent@example.com',
        grade_interested: '5-7',
        referral_source: 'production-audit',
      },
      'req-1'
    );

    expect(result.ok).toBe(true);
    expect(sendLeadToGHLMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.ghl_contact_id).toBe('ghl-123');
  });

  it('still creates canonical lead when GHL sync returns null', async () => {
    sendLeadToGHLMock.mockResolvedValue(null);
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

    const result = await postPeskidsLeadWithGHL(
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
  });
});
