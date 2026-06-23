import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { POST } from '../route';
import * as portalAuthMod from '../../../../../lib/portal-auth';
import * as n8nSuperAgentMod from '../../../../../lib/n8n-super-agent';

vi.mock('../../../../../lib/portal-auth', () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

vi.mock('../../../../../lib/n8n-super-agent', () => ({
  enqueueN8nExecution: vi.fn(),
  n8nExecuteBodySchema: {
    safeParse: (data: any) => ({ success: true, data }),
  },
}));

// Mock Supabase to avoid actual calls
vi.mock('../../../../../lib/supabase/index', () => ({
  getServiceClient: vi.fn(),
}));

// We need to mock portal-trusted-identity because route handlers import it,
// and it might cause ReferenceErrors if it depends on missing mock exports.
vi.mock('../../../../../lib/portal-trusted-identity', () => ({
  PORTAL_READ_ROLES: ['read'],
  PORTAL_WRITE_ROLES: ['write'],
  resolveTrustedPortalSession: vi.fn(),
  tenantSlugMatchesSession: vi.fn(),
}));

const ADMIN_TOKEN = 'test-admin-token';

describe('POST /api/n8n/execute security', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;
  });

  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows access with PLATFORM_ADMIN_TOKEN (static header)', async () => {
    vi.mocked(n8nSuperAgentMod.enqueueN8nExecution).mockResolvedValue({ jobId: '123' });

    const req = new Request('http://local/api/n8n/execute', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN, 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('allows access with Super Admin Supabase session (Bearer token)', async () => {
    vi.mocked(n8nSuperAgentMod.enqueueN8nExecution).mockResolvedValue({ jobId: '456' });
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: 'admin-id',
      email: 'cboteros1@gmail.com', // Default super admin email
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
    } as any);

    const req = new Request('http://local/api/n8n/execute', {
      method: 'POST',
      headers: { 'authorization': 'Bearer valid-jwt', 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('denies access with invalid token', async () => {
    // When an invalid token is provided, requireAdminAccess will try resolveSuperAdminSession,
    // which calls getUserFromAuthorizationHeader. If that returns null, it returns 401.
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue(null);

    const req = new Request('http://local/api/n8n/execute', {
      method: 'POST',
      headers: { 'x-admin-token': 'wrong-token', 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('denies access with regular user session (non-admin)', async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
    } as any);

    const req = new Request('http://local/api/n8n/execute', {
      method: 'POST',
      headers: { 'authorization': 'Bearer user-jwt', 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('denies access without any authentication', async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue(null);

    const req = new Request('http://local/api/n8n/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
