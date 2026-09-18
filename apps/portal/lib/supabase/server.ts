import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getRuntimeSupabasePublicConfig } from '@/lib/runtime-env';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { supabaseUrl: url, supabaseAnonKey: anon, configured } =
    getRuntimeSupabasePublicConfig();
  if (!configured) {
    const fallbackUrl = 'https://placeholder.supabase.co';
    const fallbackAnon = 'placeholder';
    return createServerClient(fallbackUrl, fallbackAnon, {
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
