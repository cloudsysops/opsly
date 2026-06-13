import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST as executePOST } from '../n8n/execute/route';
import { POST as decidePOST } from '../n8n/decide/route';
import { POST as helpRequestPOST, GET as helpRequestGET, PATCH as helpRequestPATCH } from '../internal/help-request/route';
import { POST as budgetEnforcePOST } from '../internal/budget-enforce/route';
import { GET as v1WebhooksGET, POST as v1WebhooksPOST } from '../v1/tenants/[ref]/webhooks/route';
import { DELETE as v1WebhookDELETE } from '../v1/tenants/[ref]/webhooks/[webhookId]/route';
import { GET as webhooksGET, POST as webhooksPOST } from '../tenants/[slug]/webhooks/route';
import { DELETE as webhookDELETE } from '../tenants/[slug]/webhooks/[webhookId]/route';
import * as auth from '../../../../lib/auth';

vi.mock('../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../lib/n8n-super-agent', () => ({
  enqueueN8nExecution: vi.fn(),
  n8nExecuteBodySchema: { safeParse: vi.fn(() => ({ success: false })) },
  buildDecisionPlan: vi.fn(),
  n8nDecideBodySchema: { safeParse: vi.fn(() => ({ success: false })) },
}));

vi.mock('../../../../lib/help-request-store', () => ({
  createHelpRequest: vi.fn(),
  listPendingHelpRequests: vi.fn(() => []),
  resolveHelpRequestRecord: vi.fn(),
}));

vi.mock('../../../../lib/billing/budget-enforcer', () => ({
  checkTenantBudget: vi.fn(),
}));

vi.mock('../../../../lib/internal/budget-enforce-response', () => ({
  executeBudgetEnforcement: vi.fn(),
}));

vi.mock('../../../../lib/repositories/webhook-repository', () => ({
  listWebhooks: vi.fn(() => []),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
}));

describe('Migrated Auth Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const endpoints = [
    { name: 'n8n/execute POST', fn: (req: Request) => executePOST(req) },
    { name: 'n8n/decide POST', fn: (req: Request) => decidePOST(req) },
    { name: 'internal/help-request POST', fn: (req: Request) => helpRequestPOST(req) },
    { name: 'internal/help-request GET', fn: (req: Request) => helpRequestGET(req) },
    { name: 'internal/help-request PATCH', fn: (req: Request) => helpRequestPATCH(req) },
    { name: 'internal/budget-enforce POST', fn: (req: Request) => budgetEnforcePOST(req) },
    { name: 'v1 webhooks GET', fn: (req: Request) => v1WebhooksGET(req, { params: Promise.resolve({ ref: 't1' }) }) },
    { name: 'v1 webhooks POST', fn: (req: Request) => v1WebhooksPOST(req, { params: Promise.resolve({ ref: 't1' }) }) },
    { name: 'v1 webhook DELETE', fn: (req: Request) => v1WebhookDELETE(req, { params: Promise.resolve({ ref: 't1', webhookId: 'w1' }) }) },
    { name: 'webhooks GET', fn: (req: Request) => webhooksGET(req, { params: Promise.resolve({ slug: 't1' }) }) },
    { name: 'webhooks POST', fn: (req: Request) => webhooksPOST(req, { params: Promise.resolve({ slug: 't1' }) }) },
    { name: 'webhook DELETE', fn: (req: Request) => webhookDELETE(req, { params: Promise.resolve({ slug: 't1', webhookId: 'w1' }) }) },
  ];

  endpoints.forEach(({ name, fn }) => {
    it(`${name} returns 401 when admin access is denied`, async () => {
      vi.spyOn(auth, 'requireAdminAccess').mockResolvedValue(
        Response.json({ error: 'unauthorized' }, { status: 401 })
      );
      const res = await fn(new Request('http://localhost'));
      expect(res.status).toBe(401);
      expect(auth.requireAdminAccess).toHaveBeenCalled();
    });
  });
});
