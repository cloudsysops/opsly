import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { checkRateLimit } from '@/lib/rate-limiter-memory';
import { getServiceClient } from '@/lib/supabase';
import { extractIp } from '@/lib/audit';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('@/lib/rate-limiter-memory', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
}));

describe('Peskids Form GET Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies rate limiting based on IP', async () => {
    const mockIp = '5.6.7.8';
    (extractIp as any).mockReturnValue(mockIp);
    (checkRateLimit as any).mockResolvedValue({ allowed: false });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`peskids-form-get:${mockIp}`);
  });

  it('allows access and logs an audit event under non-spoofable IP actor when rate limit allows', async () => {
    const mockIp = '5.6.7.8';
    (extractIp as any).mockReturnValue(mockIp);
    (checkRateLimit as any).mockResolvedValue({ allowed: true });

    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'forms') {
        const singleMock = vi.fn().mockResolvedValue({
          data: {
            id: 'guid-form-1',
            form_id: 'f1',
            tenant_slug: 'tenant-1',
            title: 'Form 1',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
        const eqMock = vi.fn().mockReturnValue({
          single: singleMock,
        });
        return {
          select: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        };
      }
      if (table === 'form_fields') {
        const orderMock = vi.fn().mockResolvedValue({
          data: [
            {
              field_id: 'name',
              field_type: 'text',
              label: 'Name',
              required: true,
              options: null,
              order: 1,
            },
          ],
          error: null,
        });
        const eqMock = vi.fn().mockReturnValue({
          order: orderMock,
        });
        return {
          select: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        };
      }
      return {};
    });

    (getServiceClient as any).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
      rpc: mockRpc,
    });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(200);

    // Verify audit log call
    const auditCall = mockRpc.mock.calls.find((call) => call[0] === 'log_audit_event');
    expect(auditCall).toBeDefined();
    const payload = auditCall![1];

    // Primary actor should be IP-based
    expect(payload.p_action).toBe('form_retrieved');
    expect(payload.p_actor_id).toBe(`anonymous:${mockIp}`);
    expect(payload.p_tenant_slug).toBe('tenant-1');
    expect(payload.p_resource_id).toBe('f1');
    expect(payload.p_resource_type).toBe('form');
  });
});
