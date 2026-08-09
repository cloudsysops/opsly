import { describe, it, expect, beforeEach, vi } from 'vitest';

const syncLeadToCrmMock = vi.hoisted(() => vi.fn());
const persistIcsoLeadMock = vi.hoisted(() => vi.fn());
const resolveIcsoDiscoveryBookingUrlMock = vi.hoisted(() => vi.fn());
const isIcsoSupabaseConfiguredMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/icso-crm-sync', () => ({
  syncLeadToCrm: syncLeadToCrmMock,
}));

vi.mock('@/lib/icso-lead-store', () => ({
  persistIcsoLead: persistIcsoLeadMock,
}));

vi.mock('@/lib/icso-discovery-link', () => ({
  resolveIcsoDiscoveryBookingUrl: resolveIcsoDiscoveryBookingUrlMock,
}));

vi.mock('@/lib/supabase-server', () => ({
  isIcsoSupabaseConfigured: isIcsoSupabaseConfiguredMock,
}));

describe('POST /api/leads', () => {
  beforeEach(() => {
    syncLeadToCrmMock.mockReset();
    persistIcsoLeadMock.mockReset();
    resolveIcsoDiscoveryBookingUrlMock.mockReset();
    isIcsoSupabaseConfiguredMock.mockReset();
    isIcsoSupabaseConfiguredMock.mockReturnValue(true);
  });

  it('persists locally and returns Twenty ids (primary path)', async () => {
    syncLeadToCrmMock.mockResolvedValue({
      twentyPersonId: 'tw-person-1',
      twentyOpportunityId: 'tw-opp-1',
    });
    persistIcsoLeadMock.mockResolvedValue({
      accountId: 'account-1',
      contactId: 'contact-local-1',
      dealId: 'deal-1',
    });
    resolveIcsoDiscoveryBookingUrlMock.mockResolvedValue(
      'https://book.example.com/discovery'
    );

    const { POST } = await import('../route');
    const request = {
      json: async () => ({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'I need help with automation',
      }),
    } as never;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.contactId).toBe('contact-local-1');
    expect(data.dealId).toBe('deal-1');
    expect(data.twentyPersonId).toBe('tw-person-1');
    expect(data.calendarBookingUrl).toBe('https://book.example.com/discovery');
    expect(persistIcsoLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'john@example.com',
        twentyPersonId: 'tw-person-1',
      })
    );
  });

  it('includes legacy ghlContactId when sidecar returns it', async () => {
    syncLeadToCrmMock.mockResolvedValue({
      ghlContactId: 'ghl-contact-123',
    });
    persistIcsoLeadMock.mockResolvedValue({
      accountId: 'account-2',
      contactId: 'contact-2',
      dealId: 'deal-2',
    });
    resolveIcsoDiscoveryBookingUrlMock.mockResolvedValue(null);

    const { POST } = await import('../route');
    const response = await POST({
      json: async () => ({
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Need automation',
      }),
    } as never);
    const data = await response.json();

    expect(data.ghlContactId).toBe('ghl-contact-123');
    expect(data.calendarBookingUrl).toBeNull();
  });

  it('rejects requests with missing fields', async () => {
    const { POST } = await import('../route');
    const response = await POST({
      json: async () => ({ name: 'John Doe' }),
    } as never);

    expect(response.status).toBe(400);
    expect(syncLeadToCrmMock).not.toHaveBeenCalled();
  });

  it('tags package, vertical, and module on enriched message', async () => {
    syncLeadToCrmMock.mockResolvedValue({});
    persistIcsoLeadMock.mockResolvedValue({
      accountId: 'account-3',
      contactId: 'contact-3',
      dealId: 'deal-3',
    });
    resolveIcsoDiscoveryBookingUrlMock.mockResolvedValue(null);

    const { POST } = await import('../route');
    await POST({
      json: async () => ({
        name: 'Lead',
        email: 'lead@example.com',
        message: 'Need CRM',
        packageId: 'hybrid-opsly',
        verticalId: 'swim-school',
        moduleId: 'lead-capture',
      }),
    } as never);

    expect(syncLeadToCrmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('[module=lead-capture]'),
      })
    );
    expect(persistIcsoLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/\[package=hybrid-opsly\][\s\S]*\[vertical=swim-school\]/),
      })
    );
  });

  it('returns 503 when Supabase is not configured', async () => {
    isIcsoSupabaseConfiguredMock.mockReturnValue(false);

    const { POST } = await import('../route');
    const response = await POST({
      json: async () => ({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Need help',
      }),
    } as never);

    expect(response.status).toBe(503);
    expect(persistIcsoLeadMock).not.toHaveBeenCalled();
  });

  it('handles persistence errors gracefully', async () => {
    syncLeadToCrmMock.mockResolvedValue({});
    persistIcsoLeadMock.mockRejectedValue(new Error('DB write failed'));

    const { POST } = await import('../route');
    const response = await POST({
      json: async () => ({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Need help',
      }),
    } as never);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('DB write failed');
  });
});
