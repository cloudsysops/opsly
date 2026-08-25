import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import * as authModule from '@/lib/auth';
import * as budgetEnforcer from '@/lib/billing/budget-enforcer';
import * as budgetEnforceResponse from '@/lib/internal/budget-enforce-response';

vi.mock('@/lib/auth', () => ({
  requireAdminToken: vi.fn(),
}));

vi.mock('@/lib/billing/budget-enforcer', () => ({
  checkTenantBudget: vi.fn(),
}));

vi.mock('@/lib/internal/budget-enforce-response', () => ({
  executeBudgetEnforcement: vi.fn(),
}));

describe('POST /api/internal/budget-enforce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when requireAdminToken returns a response', async () => {
    vi.mocked(authModule.requireAdminToken).mockReturnValue(
      Response.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new Request('http://localhost/api/internal/budget-enforce', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: 'tenant-123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when body is invalid JSON', async () => {
    vi.mocked(authModule.requireAdminToken).mockReturnValue(null);

    const request = new Request('http://localhost/api/internal/budget-enforce', {
      method: 'POST',
      body: 'invalid-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('returns 400 when tenant_id is missing', async () => {
    vi.mocked(authModule.requireAdminToken).mockReturnValue(null);

    const request = new Request('http://localhost/api/internal/budget-enforce', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('tenant_id is required');
  });

  it('returns sanitized 500 response without leaking internal error details when an exception occurs', async () => {
    vi.mocked(authModule.requireAdminToken).mockReturnValue(null);
    vi.mocked(budgetEnforcer.checkTenantBudget).mockRejectedValue(
      new Error('Secret DB Connection failed: postgresql://admin:secret@db.internal:5432/db')
    );

    const request = new Request('http://localhost/api/internal/budget-enforce', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: 'tenant-123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal budget enforcement failed');
    expect(body.error).not.toContain('Secret DB Connection');
  });

  it('returns budget enforcement payload on success', async () => {
    vi.mocked(authModule.requireAdminToken).mockReturnValue(null);
    vi.mocked(budgetEnforcer.checkTenantBudget).mockResolvedValue({
      status: 'ok',
      reason: 'within_budget',
      currentSpendUsd: 10,
      capUsd: 100,
    } as unknown as ReturnType<typeof budgetEnforcer.checkTenantBudget>);
    vi.mocked(budgetEnforceResponse.executeBudgetEnforcement).mockResolvedValue({
      action: 'none',
      tenantId: 'tenant-123',
    } as unknown as ReturnType<typeof budgetEnforceResponse.executeBudgetEnforcement>);

    const request = new Request('http://localhost/api/internal/budget-enforce', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: 'tenant-123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ action: 'none', tenantId: 'tenant-123' });
  });
});
