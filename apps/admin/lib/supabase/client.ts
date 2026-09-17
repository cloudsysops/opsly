import { createBrowserClient } from '@supabase/ssr';
import { getPublicRuntimeConfig } from '@/lib/public-runtime-config';

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder';

export function createClient() {
  const runtime = getPublicRuntimeConfig();
  const url = runtime.supabaseUrl?.trim() || FALLBACK_SUPABASE_URL;
  const anon = runtime.supabaseAnonKey?.trim() || FALLBACK_SUPABASE_ANON_KEY;
  return createBrowserClient(url, anon, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}
