import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';

const {
  mockBuildAdminCostsPayloadAsync,
  mockApplyCostDecision,
  mockParseCostDecisionBody,
  mockRequireAdminAccessUnlessDemoRead,
  mockRequireAdminAccess,
  mockFetch,
} = vi.hoisted(() => {
  const mockBuildAdminCostsPayloadAsync = vi.fn();
  const mockApplyCostDecision = vi.fn();
  const mockParseCostDecisionBody = vi.fn();
  const mockRequireAdminAccessUnlessDemoRead = vi.fn();
  const mockRequireAdminAccess = vi.fn();
  const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('OK'));

  return {
    mockBuildAdminCostsPayloadAsync,
    mockApplyCostDecision,
    mockParseCostDecisionBody,
    mockRequireAdminAccessUnlessDemoRead,
    mockRequireAdminAccess,
    mockFetch,
  };
});

vi.mock('../../../../../lib/admin-costs', () => ({
  buildAdminCostsPayloadAsync: mockBuildAdminCostsPayloadAsync,
  applyCostDecision: mockApplyCostDecision,
  parseCostDecisionBody: mockParseCostDecisionBody,
}));

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccessUnlessDemoRead: mockRequireAdminAccessUnlessDemoRead,
  requireAdminAccess: mockRequireAdminAccess,
}));

describe('GET /api/admin/costs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('returns costs payload when authorized', async () => {
    mockRequireAdminAccessUnlessDemoRead.mockResolvedValue(null);
    mockBuildAdminCostsPayloadAsync.mockResolvedValue({
      current: {
        vps_digitalocean: {
          name: 'VPS DigitalOcean',
          cost: 12,
          period: 'month',
          status: 'active',
          description: 'VPS principal',
        },
      },
      proposed: {},
      summary: {
        currentMonthly: 12,
        proposedMonthly: 12,
        potentialSavings: 0,
      },
      alerts: [],
      lastUpdated: '2026-04-20T00:00:00Z',
      tenant_budgets: [],
      llm_budget_summary: {
        tenant_count: 0,
        tenants_at_warning: 0,
        tenants_at_critical: 0,
        total_spend_usd: 0,
      },
    });

    const request = new Request('http://localhost/api/admin/costs');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.summary.currentMonthly).toBe(12);
    expect(mockBuildAdminCostsPayloadAsync).toHaveBeenCalled();
  });

  it('returns auth error when not authorized', async () => {
    const errorResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
    mockRequireAdminAccessUnlessDemoRead.mockResolvedValue(errorResponse);

    const request = new Request('http://localhost/api/admin/costs');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('includes tenant budgets in response', async () => {
    mockRequireAdminAccessUnlessDemoRead.mockResolvedValue(null);
    mockBuildAdminCostsPayloadAsync.mockResolvedValue({
      current: {},
      proposed: {},
      summary: { currentMonthly: 0, proposedMonthly: 0, potentialSavings: 0 },
      alerts: [],
      lastUpdated: '2026-04-20T00:00:00Z',
      tenant_budgets: [
        {
          tenant_slug: 'ops',
          tenant_name: 'Ops',
          current_spend_usd: 50.0,
          limit_usd: 100.0,
          percent_used: 50,
          alert_level: 'ok',
          enforcement_skipped: false,
          projected_month_end_usd: 150.0,
        },
      ],
      llm_budget_summary: {
        tenant_count: 1,
        tenants_at_warning: 0,
        tenants_at_critical: 0,
        total_spend_usd: 50.0,
      },
    });

    const request = new Request('http://localhost/api/admin/costs');
    const response = await GET(request);

    const json = await response.json();
    expect(json.tenant_budgets).toHaveLength(1);
    expect(json.tenant_budgets[0].tenant_slug).toBe('ops');
  });
});

describe('POST /api/admin/costs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('approves a cost line and sends Discord notification', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook/test';

    mockRequireAdminAccess.mockResolvedValue(null);
    mockParseCostDecisionBody.mockReturnValue({
      service_id: 'gcp_failover',
      action: 'approve',
    });
    mockApplyCostDecision.mockReturnValue({ ok: true });
    mockBuildAdminCostsPayloadAsync.mockResolvedValue({
      current: {},
      proposed: {
        gcp_failover: {
          name: 'GCP e2-micro Failover',
          cost: 10,
          period: 'month',
          status: 'approved',
          description: 'VM failover in Google Cloud',
        },
      },
      summary: { currentMonthly: 0, proposedMonthly: 10, potentialSavings: 0 },
      alerts: [],
      lastUpdated: '2026-04-20T00:00:00Z',
      tenant_budgets: [],
      llm_budget_summary: {
        tenant_count: 0,
        tenants_at_warning: 0,
        tenants_at_critical: 0,
        total_spend_usd: 0,
      },
    });

    const body = JSON.stringify({ service_id: 'gcp_failover', action: 'approve' });
    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/webhook/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it('rejects a cost line with reason and sends Discord notification', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook/test';

    mockRequireAdminAccess.mockResolvedValue(null);
    mockParseCostDecisionBody.mockReturnValue({
      service_id: 'vps_upgrade',
      action: 'reject',
      reason: 'Budget constraints',
    });
    mockApplyCostDecision.mockReturnValue({ ok: true });
    mockBuildAdminCostsPayloadAsync.mockResolvedValue({
      current: {},
      proposed: {
        vps_upgrade: {
          name: 'VPS Upgrade (4 GB)',
          cost: 24,
          period: 'month',
          status: 'rejected',
          description: 'Upgrade DO plan',
        },
      },
      summary: { currentMonthly: 0, proposedMonthly: 0, potentialSavings: 0 },
      alerts: [],
      lastUpdated: '2026-04-20T00:00:00Z',
      tenant_budgets: [],
      llm_budget_summary: {
        tenant_count: 0,
        tenants_at_warning: 0,
        tenants_at_critical: 0,
        total_spend_usd: 0,
      },
    });

    const body = JSON.stringify({
      service_id: 'vps_upgrade',
      action: 'reject',
      reason: 'Budget constraints',
    });
    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/webhook/test',
      expect.objectContaining({
        method: 'POST',
      })
    );

    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it('returns 400 on invalid JSON', async () => {
    mockRequireAdminAccess.mockResolvedValue(null);

    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body: 'invalid json {',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Invalid JSON');
  });

  it('returns 400 on missing service_id or action', async () => {
    mockRequireAdminAccess.mockResolvedValue(null);
    mockParseCostDecisionBody.mockReturnValue(null);

    const body = JSON.stringify({ service_id: '', action: '' });
    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('service_id and action required');
  });

  it('returns error from applyCostDecision', async () => {
    mockRequireAdminAccess.mockResolvedValue(null);
    mockParseCostDecisionBody.mockReturnValue({
      service_id: 'unknown_service',
      action: 'approve',
    });
    mockApplyCostDecision.mockReturnValue({
      ok: false,
      status: 404,
      error: 'Service not found',
    });

    const body = JSON.stringify({
      service_id: 'unknown_service',
      action: 'approve',
    });
    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toContain('Service not found');
  });

  it('returns auth error when not authorized', async () => {
    const errorResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
    mockRequireAdminAccess.mockResolvedValue(errorResponse);

    const body = JSON.stringify({ service_id: 'test', action: 'approve' });
    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('handles Discord webhook failure gracefully', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook/test';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    mockRequireAdminAccess.mockResolvedValue(null);
    mockParseCostDecisionBody.mockReturnValue({
      service_id: 'gcp_failover',
      action: 'approve',
    });
    mockApplyCostDecision.mockReturnValue({ ok: true });
    mockBuildAdminCostsPayloadAsync.mockResolvedValue({
      current: {},
      proposed: {
        gcp_failover: {
          name: 'GCP e2-micro Failover',
          cost: 10,
          period: 'month',
          status: 'approved',
          description: 'VM failover',
        },
      },
      summary: { currentMonthly: 0, proposedMonthly: 10, potentialSavings: 0 },
      alerts: [],
      lastUpdated: '2026-04-20T00:00:00Z',
      tenant_budgets: [],
      llm_budget_summary: {
        tenant_count: 0,
        tenants_at_warning: 0,
        tenants_at_critical: 0,
        total_spend_usd: 0,
      },
    });

    const body = JSON.stringify({ service_id: 'gcp_failover', action: 'approve' });
    const request = new Request('http://localhost/api/admin/costs', {
      method: 'POST',
      body,
    });

    const response = await POST(request);

    // Should still succeed despite Discord webhook failure
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    delete process.env.DISCORD_WEBHOOK_URL;
  });
});
