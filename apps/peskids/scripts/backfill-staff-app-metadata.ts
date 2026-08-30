/**
 * One-off backfill: copy role/tenant_slug from user_metadata -> app_metadata
 * for every existing Peskids auth user.
 *
 * Why: lib/runtime/tenant-identity.ts and lib/staff-user.ts now read role/tenant_slug/
 * is_superuser from app_metadata only (user_metadata is self-service and client-writable,
 * so it can never be an authorization signal — see security fix CN-001). Staff members
 * invited before that fix have their role in user_metadata only and would be locked out
 * of /admin, /setup, and all staff-gated API routes until this backfill runs.
 *
 * This does NOT run automatically. Requires SUPABASE_SERVICE_ROLE_KEY (Doppler prd).
 *
 * Usage:
 *   doppler run --project peskids --config prd -- npx tsx scripts/backfill-staff-app-metadata.ts --dry-run
 *   doppler run --project peskids --config prd -- npx tsx scripts/backfill-staff-app-metadata.ts
 */
import { createClient } from '@supabase/supabase-js';

const TENANT_SLUG = 'peskids';
const DRY_RUN = process.argv.includes('--dry-run');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name} (run via Doppler: doppler run --project peskids --config prd -- ...)`);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let page = 1;
  const perPage = 200;
  let migrated = 0;
  let skipped = 0;
  let alreadyOk = 0;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }
    if (data.users.length === 0) {
      break;
    }

    for (const user of data.users) {
      const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

      const userRole = typeof userMeta.role === 'string' ? userMeta.role.trim().toLowerCase() : '';
      const userTenantSlug =
        typeof userMeta.tenant_slug === 'string' ? userMeta.tenant_slug.trim().toLowerCase() : '';
      const appRole = typeof appMeta.role === 'string' ? appMeta.role.trim().toLowerCase() : '';

      // Only touch users that actually belong to this tenant and don't already have
      // an authoritative role in app_metadata.
      if (userTenantSlug !== TENANT_SLUG || appRole.length > 0) {
        if (appRole.length > 0) alreadyOk += 1;
        continue;
      }
      if (userRole.length === 0) {
        skipped += 1;
        continue;
      }

      console.log(
        `${DRY_RUN ? '[dry-run] would migrate' : 'migrating'} ${user.email ?? user.id}: role="${userRole}" tenant_slug="${TENANT_SLUG}"`
      );

      if (!DRY_RUN) {
        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            ...appMeta,
            tenant_slug: TENANT_SLUG,
            role: userRole,
          },
        });
        if (updateError) {
          console.error(`  FAILED for ${user.email ?? user.id}: ${updateError.message}`);
          continue;
        }
      }
      migrated += 1;
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  console.log(
    `\nDone. ${DRY_RUN ? 'Would migrate' : 'Migrated'}: ${migrated}. Already had app_metadata.role: ${alreadyOk}. Skipped (no role found): ${skipped}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
