import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';
import { assertPeskidsDatabaseBoundary } from './runtime-environment';
import { getAuthPublicConfig } from './auth-public-config';

export async function createServerSupabaseClient() {
  assertPeskidsDatabaseBoundary();
  const { supabaseUrl: url, supabaseAnonKey: anon, configured } = getAuthPublicConfig();
  if (!configured || !url || !anon) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
