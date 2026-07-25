#!/usr/bin/env npx tsx
/**
 * Provision Peskids owner/admin user + sync contact/support email.
 *
 * Usage:
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npx tsx scripts/peskids/provision-owner-contact.ts peskidsnatacion@gmail.com
 *
 * Temp password → /tmp/peskids-owner-temp-password.txt (mode 600), never logged.
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const TENANT_SLUG = 'peskids';
const PASSWORD_FILE = '/tmp/peskids-owner-temp-password.txt';
const DEFAULT_EMAIL = 'peskidsnatacion@gmail.com';
const ROLE = 'owner' as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

/** Gmail local-parts are ASCII — strip combining marks / accents. */
function normalizeEmail(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function generateTempPassword(): string {
  const base = randomBytes(18).toString('base64url');
  return `Pk!${base}9a`;
}

async function main(): Promise<void> {
  const emailArg = process.argv[2]?.trim();
  const email = normalizeEmail(emailArg && emailArg.includes('@') ? emailArg : DEFAULT_EMAIL);

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

  const { error: ownerUpdateError } = await platform
    .from('tenants')
    .update({ owner_email: email })
    .eq('id', tenant.id);

  if (ownerUpdateError) {
    throw new Error(`owner_email update failed: ${ownerUpdateError.message}`);
  }
  console.log('TENANT_OWNER_EMAIL_UPDATED');

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    throw new Error(listError.message);
  }

  let user = listData.users.find((u) => u.email?.trim().toLowerCase() === email) ?? null;
  const tempPassword = generateTempPassword();
  const displayName = 'Peskids Owner';

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        tenant_slug: TENANT_SLUG,
        role: ROLE,
        full_name: displayName,
      },
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
        role: ROLE,
        full_name: displayName,
      },
    });
    if (updateError || !updated.user) {
      throw new Error(updateError?.message || 'updateUserById failed');
    }
    user = updated.user;
    console.log('AUTH_USER_UPDATED');
  }

  const { data: existingMembership } = await platform
    .from('tenant_memberships')
    .select('id, status, role')
    .eq('tenant_id', tenant.id)
    .ilike('email', email)
    .maybeSingle();

  const membershipMeta = {
    display_name: displayName,
    tenant_slug: TENANT_SLUG,
    invited_via: 'provision-owner-contact-script',
  };

  if (existingMembership) {
    const { error } = await platform
      .from('tenant_memberships')
      .update({
        role: ROLE,
        status: 'active',
        user_id: user.id,
        updated_at: new Date().toISOString(),
        metadata: membershipMeta,
      })
      .eq('id', existingMembership.id);
    if (error) throw new Error(`membership update failed: ${error.message}`);
    console.log('MEMBERSHIP_UPDATED');
  } else {
    const { error } = await platform.from('tenant_memberships').insert({
      tenant_id: tenant.id,
      email,
      role: ROLE,
      status: 'active',
      user_id: user.id,
      invited_by: email,
      metadata: membershipMeta,
    });
    if (error) throw new Error(`membership insert failed: ${error.message}`);
    console.log('MEMBERSHIP_CREATED');
  }

  // Admin settings surface (public.tenant_settings)
  const settingsClient = admin;
  const { data: existingSettings } = await settingsClient
    .from('tenant_settings')
    .select('tenant_id')
    .eq('tenant_id', TENANT_SLUG)
    .maybeSingle();

  if (existingSettings?.tenant_id) {
    const { error } = await settingsClient
      .from('tenant_settings')
      .update({
        support_email: email,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', TENANT_SLUG);
    if (error) {
      console.log(`TENANT_SETTINGS_WARN=${error.message}`);
    } else {
      console.log('TENANT_SETTINGS_SUPPORT_EMAIL_UPDATED');
    }
  } else {
    const { error } = await settingsClient.from('tenant_settings').insert({
      tenant_id: TENANT_SLUG,
      support_email: email,
    });
    if (error) {
      console.log(`TENANT_SETTINGS_WARN=${error.message}`);
    } else {
      console.log('TENANT_SETTINGS_SUPPORT_EMAIL_CREATED');
    }
  }

  writeFileSync(PASSWORD_FILE, `${email}\n${tempPassword}\n`, { encoding: 'utf8', mode: 0o600 });
  chmodSync(PASSWORD_FILE, 0o600);

  console.log('OWNER_PROVISIONED');
  console.log(`EMAIL=${email}`);
  console.log(`USER_ID=${user.id}`);
  console.log(`ROLE=${ROLE}`);
  console.log(`PASSWORD_FILE=${PASSWORD_FILE}`);
}

main().catch((err: unknown) => {
  console.error('BLOCKED_BY_OWNER_PROVISION');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
