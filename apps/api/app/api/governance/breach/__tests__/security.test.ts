import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as supabase from '@/lib/supabase';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: new Date() }),
}));

vi.mock('@/lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/governance/breach security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GOVERNANCE_BREACH_SECRET: 'test-secret' };

    // Default supabase mock
    const mockInsert = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'breach-123', created_at: new Date().toISOString() },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockInsert,
      }),
    } as any);
  });

  const validPayload = {
    tenant_id: 'test-tenant',
    title: 'Test Breach',
    description: 'Test Description',
    discovered_at: new Date().toISOString(),
    severity: 'high',
  };

  it('should call checkRateLimit', async () => {
    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: { 'authorization': 'Bearer test-secret' },
      body: JSON.stringify(validPayload),
    });

    await POST(request);

    expect(rateLimiter.checkRateLimit).toHaveBeenCalled();
  });

  it('should call logAuditEvent on success', async () => {
    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: { 'authorization': 'Bearer test-secret' },
      body: JSON.stringify(validPayload),
    });

    await POST(request);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'governance_breach_log',
      tenant_slug: 'test-tenant',
    }));
  });
});
