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
    const mockIp = '1.2.3.4';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 10, remaining: 0, reset: 1234 });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`peskids-form-get:${mockIp}`);
  });

  it('allows access, retrieves form and logs audit event', async () => {
    const mockIp = '5.6.7.8';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 10, remaining: 9, reset: 1234 });

    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'guid-form-1',
        form_id: 'f1',
        tenant_slug: 't1',
        title: 'Mock Form',
        description: 'Test Description',
        status: 'active',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
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
          order: 0,
        },
      ],
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      order: mockOrder,
    });

    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
      rpc: mockRpc,
    };

    vi.mocked(getServiceClient).mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe('guid-form-1');
    expect(data.title).toBe('Mock Form');
    expect(data.fields).toHaveLength(1);
    expect(data.fields[0].label).toBe('Name');

    // Verify audit event logging
    expect(mockRpc).toHaveBeenCalledWith('log_audit_event', {
      p_action: 'form_retrieved',
      p_actor_id: `anonymous:${mockIp}`,
      p_tenant_slug: 't1',
      p_resource_id: 'f1',
      p_resource_type: 'form',
      p_metadata: { ip: mockIp },
    });
  });
});
