import { logger } from './logger';
import { meterShieldApiCall } from './shield-metering';
import { recomputeAndPersistShieldScore, runShieldSecretScan } from './shield-scan';
import { getServiceClient } from './supabase';

export async function fetchActiveTenantSlugsForShield(): Promise<string[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .select('slug')
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error !== null) {
    logger.error('shield cron fetchActiveTenantSlugs', error);
    return [];
  }
  const rows = (data ?? []) as { slug: string }[];
  return rows.map((r) => r.slug).filter((s) => s.length > 0);
}

/**
 * Daily secret scan + score recompute for all active tenants (cron).
 */
export async function runShieldDailyScanAllTenants(): Promise<{
  tenants: number;
  findings_inserted: number;
  scores_updated: number;
}> {
  const slugs = await fetchActiveTenantSlugsForShield();
  let findingsInserted = 0;
  let scoresUpdated = 0;

  for (const slug of slugs) {
    const scan = await runShieldSecretScan(slug);
    findingsInserted += scan.inserted;
    const score = await recomputeAndPersistShieldScore(slug);
    if (score !== null) {
      scoresUpdated += 1;
    }
    void meterShieldApiCall({
      tenant_slug: slug,
      feature: 'shield_cron_daily_scan',
      metadata: { findings_inserted: scan.inserted, score: score?.score },
    });
  }

  return {
    tenants: slugs.length,
    findings_inserted: findingsInserted,
    scores_updated: scoresUpdated,
  };
}
