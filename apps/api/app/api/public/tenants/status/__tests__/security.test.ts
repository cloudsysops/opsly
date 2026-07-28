import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractIp, logAuditEvent } from '../../../../../../lib/audit';
import { checkRateLimit } from '../../../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../../../lib/supabase';
import { GET } from '../route';

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../lib/audit', () => ({
  extractIp: vi.fn(),
  logAuditEvent: vi.fn(),
}));

describe('Public Tenant Status Security and Auditing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with 400 Bad Request if email query parameter is invalid', async () => {
    const request = new Request('http://localhost/api/public/tenants/status?email=notanemail');
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('applies rate limiting based on client IP', async () => {
    const mockIp = '203.0.113.195';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new Request(
      'http://localhost/api/public/tenants/status?email=test.user@example.com'
    );
    const response = await GET(request);

    expect(response.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`public-status:${mockIp}`);
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('audits successful tenant retrieval and masks email PII', async () => {
    const mockIp = '203.0.113.195';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        status: 'active',
        progress: 'completed',
        services: { portal: { enabled: true } },
        slug: 'acme',
      },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockSingle,
    });

    const mockClient = {
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as unknown as ReturnType<typeof getServiceClient>;

    vi.mocked(getServiceClient).mockReturnValue(mockClient);

    const request = new Request(
      'http://localhost/api/public/tenants/status?email=test.user@example.com'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('active');

    // Check that auditing logged the event with masked email
    expect(logAuditEvent).toHaveBeenCalledWith({
      tenant_slug: 'acme',
      action: 'RETRIEVE_STATUS',
      resource: 'public:tenant_status:acme',
      ip: mockIp,
      user_agent: undefined,
      metadata: {
        email: 't***r@example.com', // test.user -> t***r
        found: true,
        status: 'active',
      },
    });
  });

  it('audits failed tenant retrieval (not found) and masks email PII', async () => {
    const mockIp = '203.0.113.195';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockSingle,
    });

    const mockClient = {
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as unknown as ReturnType<typeof getServiceClient>;

    vi.mocked(getServiceClient).mockReturnValue(mockClient);

    const request = new Request(
      'http://localhost/api/public/tenants/status?email=short@example.com'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('not_found');

    // Check that auditing logged the event with masked email
    expect(logAuditEvent).toHaveBeenCalledWith({
      tenant_slug: undefined,
      action: 'RETRIEVE_STATUS_FAILED',
      resource: 'public:tenant_status',
      ip: mockIp,
      user_agent: undefined,
      metadata: {
        email: 's***t@example.com', // short -> s***t
        found: false,
      },
    });
  });

  it('correctly handles edge-case short emails for masking', async () => {
    const mockIp = '203.0.113.195';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockSingle,
    });

    const mockClient = {
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as unknown as ReturnType<typeof getServiceClient>;

    vi.mocked(getServiceClient).mockReturnValue(mockClient);

    const request = new Request('http://localhost/api/public/tenants/status?email=a@b.com');
    await GET(request);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          email: 'a***@b.com',
          found: false,
        },
      })
    );
  });
});
