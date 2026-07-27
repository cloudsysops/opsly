import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { checkRateLimit } from '../../../../../../lib/rate-limiter-memory';
import { getServiceClient } from '../../../../../../lib/supabase';
import { extractIp } from '../../../../../../lib/audit';

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../../lib/rate-limiter-memory', () => ({
  checkRateLimit: vi.fn(),
  resetRateLimiterMemoryStateForTests: vi.fn(),
}));

vi.mock('../../../../../../lib/audit', () => ({
  extractIp: vi.fn(),
}));

describe('Peskids Form Retrieval Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies rate limiting based on IP', async () => {
    const mockIp = '1.2.3.4';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`peskids-form-get:${mockIp}`);
  });

  it('logs audit event on successful retrieval', async () => {
    const mockIp = '5.6.7.8';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'guid-1',
        form_id: 'f1',
        tenant_slug: 't1',
        title: 'Mock Form',
        description: 'Test description',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      error: null,
    });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          field_id: 'field-1',
          field_type: 'text',
          label: 'Name',
          required: true,
          options: null,
          order: 1,
        },
      ],
      error: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockSingle,
        };
      }
      if (table === 'form_fields') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: mockOrder,
        };
      }
      return {};
    });

    const mockedGetServiceClient = vi.mocked(getServiceClient);
    mockedGetServiceClient.mockReturnValue({
      schema: vi.fn().mockReturnThis(),
      from: mockFrom as unknown as ReturnType<ReturnType<typeof getServiceClient>['from']>,
      rpc: mockRpc,
    } as unknown as ReturnType<typeof getServiceClient>);

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.title).toBe('Mock Form');

    // Verify audit log call
    const auditCall = mockRpc.mock.calls.find((call) => call[0] === 'log_audit_event');
    expect(auditCall).toBeDefined();
    const payload = auditCall![1] as Record<string, unknown>;

    expect(payload.p_action).toBe('form_retrieved');
    expect(payload.p_actor_id).toBe(`anonymous:${mockIp}`);
    expect(payload.p_tenant_slug).toBe('t1');
    expect(payload.p_resource_id).toBe('f1');
    expect(payload.p_resource_type).toBe('form');
  });
});
