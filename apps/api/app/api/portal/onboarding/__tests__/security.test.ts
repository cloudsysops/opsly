import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import * as audit from '../../../../../lib/audit';
import * as portalAuth from '../../../../../lib/portal-auth';
import * as supabase from '../../../../../lib/supabase';

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(() => '127.0.0.1'),
  };
});

vi.mock('../../../../../lib/portal-auth', () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/portal/onboarding security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new Request('http://localhost/api/portal/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        org_name: 'Acme Corp',
        slug: 'acme-corp',
        plan: 'startup',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('portal-onboarding:127.0.0.1');
  });

  it('logs security audit event upon successful onboarding', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date(),
    });

    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      id: 'usr_123',
      email: 'owner@acme.com',
      user_metadata: {},
    } as any);

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelectCheck = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
        is: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'ten_123' }, error: null }),
      }),
    });

    const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenants') {
            return {
              select: mockSelectCheck,
              insert: mockInsert,
            };
          }
          return {};
        }),
      }),
      auth: {
        admin: {
          updateUserById: mockUpdateUser,
        },
      },
    } as any);

    const request = new Request('http://localhost/api/portal/onboarding', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_jwt',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        org_name: 'Acme Corp',
        slug: 'acme-corp',
        plan: 'startup',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'portal_onboarding_success',
        actor_id: 'usr_123',
        tenant_slug: 'acme-corp',
        ip_address: '127.0.0.1',
        metadata: { org_name: 'Acme Corp', plan: 'startup', tenant_id: 'ten_123' },
      })
    );
  });
});
