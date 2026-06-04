import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as orchestratorGET } from '../orchestrator/route';
import { GET as teamsGET } from '../teams/route';
import { requireAdminAccess } from '../../../../../lib/auth';

// Mock dependencies to avoid side effects
vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
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

describe('Mission Control Security Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('orchestrator endpoint', () => {
    it('returns 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const res = await orchestratorGET(new Request('http://localhost/api/admin/mission-control/orchestrator'));
      expect(res.status).toBe(403);
      expect(requireAdminAccess).toHaveBeenCalled();
    });

    it('returns 200 when admin access is granted', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
      const res = await orchestratorGET(new Request('http://localhost/api/admin/mission-control/orchestrator'));
      expect(res.status).toBe(200);
      expect(requireAdminAccess).toHaveBeenCalled();
    });
  });

  describe('teams endpoint', () => {
    it('returns 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const res = await teamsGET(new Request('http://localhost/api/admin/mission-control/teams'));
      expect(res.status).toBe(403);
      expect(requireAdminAccess).toHaveBeenCalled();
    });

    it('returns 200 when admin access is granted', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
      const res = await teamsGET(new Request('http://localhost/api/admin/mission-control/teams'));
      expect(res.status).toBe(200);
      expect(requireAdminAccess).toHaveBeenCalled();
    });
  });
});
