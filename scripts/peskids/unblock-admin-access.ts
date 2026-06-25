#!/usr/bin/env npx tsx
/**
 * Unblock Peskids staff admin login: metadata, membership, temporary password.
 * Usage: doppler run --project ops-intcloudsysops --config prd -- npx tsx scripts/peskids/unblock-admin-access.ts peskids.admin@gmail.com
 * Password written to /tmp/peskids-admin-temp-password.txt (mode 600) — not logged.
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const TENANT_SLUG = 'peskids';
const DEFAULT_OWNER = 'sierrasantiago90@gmail.com';
const PASSWORD_FILE = '/tmp/peskids-admin-temp-password.txt';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function generateTempPassword(): string {
  const base = randomBytes(18).toString('base64url');
  return `Pk!${base}9a`;
}

async function main(): Promise<void> {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  const email = emailArg && emailArg.includes('@') ? emailArg : 'peskids.admin@gmail.com';
  const role = 'admin';

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const platform = admin.schema('platform');

  const { data: tenant, error: tenantError } = await platform
    .from('tenants')
    .select('id, slug, name, owner_email')
    .eq('slug', TENANT_SLUG)
    .is('deleted_at', null)
    .maybeSingle();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message || 'Peskids tenant not found');
  }

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    throw new Error(listError.message);
  }

  let user = listData.users.find((u) => u.email?.trim().toLowerCase() === email) ?? null;

  const tempPassword = generateTempPassword();

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { tenant_slug: TENANT_SLUG, role, full_name: 'Peskids Admin QA' },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message || 'createUser failed');
    }
    user = created.user;
    console.log('AUTH_USER_CREATED');
  } else {
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata as Record<string, unknown>),
        tenant_slug: TENANT_SLUG,
        role,
      },
    });
    if (updateError || !updated.user) {
      throw new Error(updateError?.message || 'updateUserById failed');
    }
    user = updated.user;
    console.log('AUTH_USER_UPDATED');
  }

  const ownerEmail = tenant.owner_email?.trim() || DEFAULT_OWNER;
  const { data: existingMembership } = await platform
    .from('tenant_memberships')
    .select('id, status, role')
    .eq('tenant_id', tenant.id)
    .ilike('email', email)
    .maybeSingle();

  if (existingMembership) {
    await platform
      .from('tenant_memberships')
      .update({
        role,
        status: 'active',
        user_id: user.id,
        updated_at: new Date().toISOString(),
        metadata: {
          display_name: 'Peskids Admin QA',
          tenant_slug: TENANT_SLUG,
          invited_via: 'unblock-admin-access-script',
        },
      })
      .eq('id', existingMembership.id);
    console.log('MEMBERSHIP_UPDATED');
  } else {
    await platform.from('tenant_memberships').insert({
      tenant_id: tenant.id,
      email,
      role,
      status: 'active',
      user_id: user.id,
      invited_by: ownerEmail,
      metadata: {
        display_name: 'Peskids Admin QA',
        tenant_slug: TENANT_SLUG,
        invited_via: 'unblock-admin-access-script',
      },
    });
    console.log('MEMBERSHIP_CREATED');
  }

  writeFileSync(PASSWORD_FILE, `${email}\n${tempPassword}\n`, { encoding: 'utf8', mode: 0o600 });
  chmodSync(PASSWORD_FILE, 0o600);

  console.log('ADMIN_LOGIN_UNBLOCKED');
  console.log(`USER_ID=${user.id}`);
  console.log(`METADATA=${JSON.stringify({ tenant_slug: TENANT_SLUG, role })}`);
  console.log(`PASSWORD_FILE=${PASSWORD_FILE}`);
}

main().catch((err: unknown) => {
  console.error('BLOCKED_BY_SUPABASE_ADMIN_ACCESS');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
