import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Fallback for build without env - creates dummy client for prerendering
    const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const fallbackAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    return createBrowserClient(fallbackUrl, fallbackAnon, {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        experimental: { passkey: true },
      },
    });
  }
  return createBrowserClient(url, anon, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      experimental: { passkey: true },
    },
  });
}
