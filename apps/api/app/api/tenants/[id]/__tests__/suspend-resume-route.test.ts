import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { POST as suspendPost } from '../suspend/route';
import { POST as resumePost } from '../resume/route';
import * as supabaseMod from '../../../../../lib/supabase';
import * as orchestratorMod from '../../../../../lib/orchestrator';

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../lib/orchestrator', () => ({
  suspendTenant: vi.fn(),
  resumeTenant: vi.fn(),
}));

const ADMIN = 'suspend-resume-admin';
const UUID = '550e8400-e29b-41d4-a716-446655440000';

function adminHeaders(): HeadersInit {
  return { authorization: `Bearer ${ADMIN}` };
}

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function mockMaybeSingle(data: unknown, error: unknown) {
  return {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () => Promise.resolve({ data, error }),
            }),
          }),
        }),
      }),
    }),
  } as ReturnType<typeof supabaseMod.getServiceClient>;
}

describe('POST /api/tenants/:id/suspend', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without token', async () => {
    const res = await suspendPost(new Request('http://x', { method: 'POST' }), params(UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for bad uuid', async () => {
    const res = await suspendPost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params('nope')
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when tenant missing', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockMaybeSingle(null, null));
    const res = await suspendPost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params(UUID)
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 on fetch error', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockMaybeSingle(null, { message: 'e' })
    );
    const res = await suspendPost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params(UUID)
    );
    expect(res.status).toBe(500);
  });

  it('returns 200 when suspend succeeds', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockMaybeSingle({ id: UUID }, null));
    vi.mocked(orchestratorMod.suspendTenant).mockResolvedValue(undefined);
    const res = await suspendPost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params(UUID)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('suspended');
  });

  it('maps Tenant not found from orchestrator to 404', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockMaybeSingle({ id: UUID }, null));
    vi.mocked(orchestratorMod.suspendTenant).mockRejectedValue(new Error('Tenant not found'));
    const res = await suspendPost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params(UUID)
    );
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tenants/:id/resume', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without token', async () => {
    const res = await resumePost(new Request('http://x', { method: 'POST' }), params(UUID));
    expect(res.status).toBe(401);
  });

  it('returns 409 when tenant is not suspended', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockMaybeSingle({ id: UUID }, null));
    vi.mocked(orchestratorMod.resumeTenant).mockRejectedValue(new Error('Tenant is not suspended'));
    const res = await resumePost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params(UUID)
    );
    expect(res.status).toBe(409);
  });

  it('returns 200 when resume succeeds', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockMaybeSingle({ id: UUID }, null));
    vi.mocked(orchestratorMod.resumeTenant).mockResolvedValue(undefined);
    const res = await resumePost(
      new Request('http://x', { method: 'POST', headers: adminHeaders() }),
      params(UUID)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('active');
  });
});
