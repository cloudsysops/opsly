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
      limit: 10,
      remaining: 0,
      reset: 0,
    });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`peskids-form-get:${mockIp}`);
  });

  it('retrieves form metadata and logs form_retrieved audit event with IP actor', async () => {
    const mockIp = '1.2.3.4';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      reset: 0,
    });

    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSingleForm = vi.fn().mockResolvedValue({
      data: {
        id: 'guid-1',
        form_id: 'f1',
        tenant_slug: 't1',
        title: 'Form Title',
        description: 'desc',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      error: null,
    });
    const mockOrderFields = vi.fn().mockResolvedValue({
      data: [
        {
          field_id: 'fd1',
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
          single: mockSingleForm,
        };
      }
      if (table === 'form_fields') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: mockOrderFields,
        };
      }
      return {};
    });

    const mockClient = {
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
      rpc: mockRpc,
    };

    vi.mocked(getServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof getServiceClient>
    );

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe('guid-1');
    expect(data.title).toBe('Form Title');
    expect(data.fields).toHaveLength(1);
    expect(data.fields[0].label).toBe('Name');

    // Verify audit log call
    const auditCall = mockRpc.mock.calls.find((call) => call[0] === 'log_audit_event');
    expect(auditCall).toBeDefined();
    const payload = auditCall![1];

    expect(payload.p_action).toBe('form_retrieved');
    expect(payload.p_actor_id).toBe(`anonymous:${mockIp}`);
    expect(payload.p_tenant_slug).toBe('t1');
    expect(payload.p_resource_id).toBe('f1');
    expect(payload.p_resource_type).toBe('form');
    expect(payload.p_metadata.ip).toBe(mockIp);
  });
});
