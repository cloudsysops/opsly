import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '../route';

const { requireAdminAccessMock, updateLeadStageMock, logAuditEventMock } = vi.hoisted(() => ({
  requireAdminAccessMock: vi.fn(),
  updateLeadStageMock: vi.fn(),
  logAuditEventMock: vi.fn(),
}));

vi.mock('../../../../../../../../../lib/auth', () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock('../../../../../../../../../lib/peskids/sales-pipeline', () => ({
  updateLeadStage: updateLeadStageMock,
}));

vi.mock('../../../../../../../../../lib/audit', () => ({
  extractIp: () => '192.168.1.100',
  logAuditEvent: logAuditEventMock,
}));

describe('PATCH /api/admin/peskids/[slug]/leads/[leadId]/stage security & authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated or non-admin requests with 401', async () => {
    requireAdminAccessMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const req = new Request('http://localhost/api/admin/peskids/peskids/leads/lead-123/stage', {
      method: 'PATCH',
      body: JSON.stringify({ stage: 'Contacted' }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ slug: 'peskids', leadId: 'lead-123' }),
    });
    expect(res.status).toBe(401);
    expect(updateLeadStageMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it('logs audit event on successful lead stage update', async () => {
    requireAdminAccessMock.mockResolvedValue(null);
    updateLeadStageMock.mockResolvedValue({
      ok: true,
      lead: { id: 'lead-123', stage: 'Contacted' },
    });

    const req = new Request('http://localhost/api/admin/peskids/peskids/leads/lead-123/stage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'Contacted' }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ slug: 'peskids', leadId: 'lead-123' }),
    });
    expect(res.status).toBe(200);

    expect(logAuditEventMock).toHaveBeenCalledWith({
      tenant_slug: 'peskids',
      action: 'peskids_lead_stage_updated',
      resource: 'lead-123',
      ip: '192.168.1.100',
      metadata: {
        stage: 'Contacted',
      },
    });
  });
});
