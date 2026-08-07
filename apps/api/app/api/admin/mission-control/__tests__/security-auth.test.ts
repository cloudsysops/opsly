import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as orchestratorGET } from '../orchestrator/route';
import { GET as teamsGET } from '../teams/route';
import { GET as auditGET } from '../../audit/route';
import { GET as openwaGET } from '../../channels/openwa/[slug]/status/route';
import { requireAdminAccess } from '../../../../../lib/auth';

// Mock dependencies to avoid side effects
vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
  requireAdminToken: vi.fn(), // Legacy helper used in some routes
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    lLen: vi.fn().mockResolvedValue(0),
    on: vi.fn(),
  })),
}));

vi.mock('@intcloudsysops/openwa', () => ({
  isOpenWAEnabledForTenant: vi.fn().mockReturnValue(true),
  getConfigForTenant: vi.fn().mockReturnValue({ apiUrl: 'http://wa' }),
  getSession: vi.fn().mockResolvedValue({}),
}));

describe('Mission Control and Admin Security Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost';
  });

  describe('orchestrator endpoint', () => {
    it('returns 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const res = await orchestratorGET(
        new Request('http://localhost/api/admin/mission-control/orchestrator')
      );
      expect(res.status).toBe(403);
    });

    it('returns 200 when admin access is granted', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
      const res = await orchestratorGET(
        new Request('http://localhost/api/admin/mission-control/orchestrator')
      );
      expect(res.status).toBe(200);
    });
  });

  describe('teams endpoint', () => {
    it('returns 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const res = await teamsGET(new Request('http://localhost/api/admin/mission-control/teams'));
      expect(res.status).toBe(403);
    });

    it('returns 200 when admin access is granted', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
      const res = await teamsGET(new Request('http://localhost/api/admin/mission-control/teams'));
      expect(res.status).toBe(200);
    });
  });

  describe('audit endpoint', () => {
    it('returns 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const res = await auditGET(new Request('http://localhost/api/admin/audit'));
      expect(res.status).toBe(403);
    });
  });

  describe('openwa status endpoint', () => {
    it('returns 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const res = await openwaGET(
        new Request('http://localhost/api/admin/channels/openwa/test-slug/status'),
        { params: Promise.resolve({ slug: 'test-slug' }) }
      );
      expect(res.status).toBe(403);
    });
  });
});
