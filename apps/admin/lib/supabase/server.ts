import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAuthPublicConfig } from '@/lib/auth-public-config';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { supabaseUrl: url, supabaseAnonKey: anon, configured } = getAuthPublicConfig();
  if (!configured) {
    throw new Error('Missing Supabase URL or anon key');
  }
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignore when not mutable */
        }
      },
    },
  });
}
