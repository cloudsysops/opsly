import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCreateContact = vi.fn();
const mockListCalendars = vi.fn();

vi.mock('@intcloudsysops/services/gohighlevel', () => ({
  isGoHighLevelConfigured: () => true,
  resolveGoHighLevelEnv: () => ({
    apiKey: 'test-key',
    baseUrl: 'https://api.example.com',
    locationId: 'test-location',
    apiVersion: '2021-07-01',
  }),
  GoHighLevelClient: class {
    constructor() {}
    createContact = mockCreateContact;
    listCalendars = mockListCalendars;
  },
}));

vi.mock('@/lib/ghl-setup', () => ({
  findIcsoDiscoveryCalendar: vi.fn(async () => 'test-calendar-id'),
}));

describe('POST /api/leads', () => {
  beforeEach(() => {
    mockCreateContact.mockReset();
    mockListCalendars.mockReset();
  });

  it('creates a contact and returns calendar booking URL', async () => {
    mockCreateContact.mockResolvedValue({
      id: 'contact-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

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
    expect(data.contactId).toBe('contact-123');
    expect(data.calendarBookingUrl).toBe(
      'https://app.gohighlevel.com/calendar/test-location/test-calendar-id'
    );
    expect(mockCreateContact).toHaveBeenCalled();
  });

  it('returns success without calendar URL if calendar not found', async () => {
    mockCreateContact.mockResolvedValue({
      id: 'contact-456',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    });

    // Import and override the findIcsoDiscoveryCalendar mock
    vi.resetModules();
    vi.doMock('@/lib/ghl-setup', () => ({
      findIcsoDiscoveryCalendar: vi.fn(async () => null),
    }));

    const { POST } = await import('../route');
    const request = {
      json: async () => ({
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Need automation',
      }),
    } as never;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.calendarBookingUrl).toBeNull();
  });

  it('rejects requests with missing fields', async () => {
    const { POST } = await import('../route');
    const request = {
      json: async () => ({
        name: 'John Doe',
        // missing email and message
      }),
    } as never;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it('handles GHL errors gracefully', async () => {
    mockCreateContact.mockRejectedValue(new Error('GHL API error'));

    const { POST } = await import('../route');
    const request = {
      json: async () => ({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Need help',
      }),
    } as never;

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('GHL API error');
  });
});
