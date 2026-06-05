import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export type SupabaseBrowserConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function resolveBrowserConfig(config?: Partial<SupabaseBrowserConfig>): SupabaseBrowserConfig {
  const supabaseUrl =
    config?.supabaseUrl?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey =
    config?.supabaseAnonKey?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  return {
    supabaseUrl: supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey: supabaseAnonKey || 'placeholder',
  };
}

export function createClient(config?: Partial<SupabaseBrowserConfig>) {
  const { supabaseUrl, supabaseAnonKey } = resolveBrowserConfig(config);

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      experimental: { passkey: true },
    },
  });
}
