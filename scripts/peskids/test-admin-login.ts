#!/usr/bin/env npx tsx
/**
 * Verify peskids.admin@gmail.com can sign in with PESKIDS_ADMIN_PASSWORD.
 * Usage: doppler run --project ops-intcloudsysops --config prd -- npx tsx scripts/peskids/test-admin-login.ts
 */
import { createClient } from '@supabase/supabase-js';

const EMAIL = (process.env.PESKIDS_ADMIN_EMAIL || 'peskids.admin@gmail.com').trim().toLowerCase();

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  const password = process.env.PESKIDS_ADMIN_PASSWORD?.trim();

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!password) {
    throw new Error('Missing PESKIDS_ADMIN_PASSWORD');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    throw listError;
  }

  const user = listData.users.find((u) => u.email?.trim().toLowerCase() === EMAIL);
  console.log('USER_FOUND', Boolean(user));
  if (user) {
    console.log('USER_ID', user.id);
    console.log('EMAIL_CONFIRMED', Boolean(user.email_confirmed_at));
    console.log('METADATA', JSON.stringify(user.user_metadata));
  }

  if (!anon) {
    console.log('ANON_KEY_MISSING skip client login test');
    return;
  }

  const client = createClient(url, anon);
  const { data, error } = await client.auth.signInWithPassword({
    email: EMAIL,
    password,
  });

  if (error) {
    console.log('LOGIN_FAIL', error.message);
    process.exitCode = 1;
    return;
  }

  console.log('LOGIN_OK', data.user?.id);
  const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
  console.log('ROLE', meta?.role);
  console.log('TENANT_SLUG', meta?.tenant_slug);
  console.log('IS_SUPERUSER', meta?.is_superuser);
}

main().catch((err: unknown) => {
  console.error('ERROR', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
