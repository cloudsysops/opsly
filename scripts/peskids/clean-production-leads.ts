#!/usr/bin/env npx tsx
/**
 * Wipe Peskids production leads (and lead followups) for a clean soft-launch start.
 *
 * Usage:
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npx tsx scripts/peskids/clean-production-leads.ts --dry-run
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npx tsx scripts/peskids/clean-production-leads.ts --yes
 *
 * Scope: tenant_id = peskids only. Does not delete students/families.
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TENANT_ID = 'peskids';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--yes');

  if (!dryRun && !confirmed) {
    console.error('Refusing to delete without --dry-run or --yes');
    process.exit(1);
  }

  execFileSync(
    'bash',
    [join(dirname(fileURLToPath(import.meta.url)), '../lib/peskids-data-safety-guard.sh'), 'lead cleanup'],
    { env: process.env, stdio: 'inherit' }
  );

  const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: leadCount, error: leadCountError } = await admin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  if (leadCountError) throw leadCountError;

  const { count: followupCount, error: followupCountError } = await admin
    .from('followups')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('contact_type', 'lead');
  if (followupCountError) throw followupCountError;

  console.log(`TENANT=${TENANT_ID}`);
  console.log(`LEADS=${leadCount ?? 0}`);
  console.log(`LEAD_FOLLOWUPS=${followupCount ?? 0}`);

  // Best-effort: legacy platform.peskids_leads if present
  const platform = admin.schema('platform');
  const { count: legacyCount, error: legacyError } = await platform
    .from('peskids_leads')
    .select('id', { count: 'exact', head: true });
  if (legacyError) {
    console.log(`LEGACY_PESKIDS_LEADS=skip (${legacyError.message})`);
  } else {
    console.log(`LEGACY_PESKIDS_LEADS=${legacyCount ?? 0}`);
  }

  if (dryRun) {
    console.log('DRY_RUN=ok (no deletes)');
    return;
  }

  const { error: followupDeleteError, count: deletedFollowups } = await admin
    .from('followups')
    .delete({ count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .eq('contact_type', 'lead');
  if (followupDeleteError) throw followupDeleteError;
  console.log(`DELETED_LEAD_FOLLOWUPS=${deletedFollowups ?? 0}`);

  const { error: leadDeleteError, count: deletedLeads } = await admin
    .from('leads')
    .delete({ count: 'exact' })
    .eq('tenant_id', TENANT_ID);
  if (leadDeleteError) throw leadDeleteError;
  console.log(`DELETED_LEADS=${deletedLeads ?? 0}`);

  if (!legacyError && (legacyCount ?? 0) > 0) {
    const { error: legacyDeleteError, count: deletedLegacy } = await platform
      .from('peskids_leads')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (legacyDeleteError) {
      console.log(`LEGACY_DELETE_WARN=${legacyDeleteError.message}`);
    } else {
      console.log(`DELETED_LEGACY_PESKIDS_LEADS=${deletedLegacy ?? 0}`);
    }
  }

  const { count: remaining } = await admin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  console.log(`REMAINING_LEADS=${remaining ?? 0}`);
  console.log('CLEAN_LEADS_DONE');
}

main().catch((err: unknown) => {
  console.error('CLEAN_LEADS_FAILED');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
