import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServiceClient } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: new Date() }),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn().mockReturnValue('1.2.3.4'),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('DSAR API Security', () => {
  const mockInsert = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'dsar-123',
      created_at: new Date().toISOString(),
      sla_deadline: new Date().toISOString(),
    },
    error: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceClient as any).mockReturnValue({
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      }),
    });
  });

  it('verifies that rate limiting is checked', async () => {
    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
      }),
    });

    await POST(req);

    expect(checkRateLimit).toHaveBeenCalledWith('ip:1.2.3.4');
  });

  it('verifies that rate limiting blocks excessive requests', async () => {
    (checkRateLimit as any).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('Too many requests');
  });

  it('verifies that audit logging is performed', async () => {
    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
      }),
    });

    await POST(req);

    // This will fail initially because audit logging is not yet implemented
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'dsar_request_created',
        tenant_slug: 'test-tenant',
      })
    );
  });
});
