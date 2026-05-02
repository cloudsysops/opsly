import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeShieldScore } from '../shield-score';
import * as repo from '../repositories/shield-repository';

vi.mock('../repositories/shield-repository', () => ({
  listShieldSecretFindings: vi.fn(),
}));

describe('computeShieldScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 100 when no open findings', async () => {
    vi.mocked(repo.listShieldSecretFindings).mockResolvedValue([]);
    const r = await computeShieldScore('acme');
    expect(r.score).toBe(100);
    expect(r.breakdown.open_findings_count).toBe(0);
  });

  it('deducts for open critical findings', async () => {
    vi.mocked(repo.listShieldSecretFindings).mockResolvedValue([
      {
        id: '1',
        tenant_slug: 'acme',
        repo_url: null,
        secret_type: 'api_key',
        file_path: 'a.ts',
        line_number: 1,
        severity: 'critical',
        status: 'open',
        created_at: '2026-01-01',
      },
    ]);
    const r = await computeShieldScore('acme');
    expect(r.score).toBe(85);
    expect(r.breakdown.by_severity).toEqual({ critical: 1 });
  });
});
