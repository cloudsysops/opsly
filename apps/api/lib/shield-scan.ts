import { insertShieldSecretFindings } from './repositories/shield-repository';
import { computeShieldScore } from './shield-score';
import { insertShieldScoreHistory } from './repositories/shield-repository';

/**
 * MVP scanner: simulated finding when SHIELD_SECRET_SCAN_SIMULATE=true.
 * Real repo scanning hooks in Phase 3+ (no secrets in git).
 */
export async function runShieldSecretScan(tenantSlug: string): Promise<{ inserted: number }> {
  const simulate = process.env.SHIELD_SECRET_SCAN_SIMULATE?.trim() === 'true';
  if (!simulate) {
    return { inserted: 0 };
  }
  const n = await insertShieldSecretFindings([
    {
      tenant_slug: tenantSlug,
      repo_url: process.env.SHIELD_SCAN_REPO_URL?.trim() || null,
      secret_type: 'simulated_scan',
      file_path: null,
      line_number: null,
      severity: 'low',
      status: 'open',
    },
  ]);
  return { inserted: n };
}

export async function recomputeAndPersistShieldScore(tenantSlug: string): Promise<{
  score: number;
  breakdown: Record<string, unknown>;
} | null> {
  const { score, breakdown } = await computeShieldScore(tenantSlug);
  const row = await insertShieldScoreHistory({ tenant_slug: tenantSlug, score, breakdown });
  if (row === null) {
    return null;
  }
  return { score, breakdown };
}
