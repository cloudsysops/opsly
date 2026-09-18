import { createBrowserClient } from '@supabase/ssr';
import { getPublicRuntimeConfig } from '@/lib/public-runtime-config';

export function createClient() {
  const runtime = getPublicRuntimeConfig();
  const url = runtime.supabaseUrl?.trim() || 'https://placeholder.supabase.co';
  const anon = runtime.supabaseAnonKey?.trim() || 'placeholder';
  return createBrowserClient(url, anon, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      experimental: { passkey: true },
    },
  });
}
