import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { getAuthPublicConfig } from './auth-public-config';

export type SupabaseBrowserConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function resolveBrowserConfig(config?: Partial<SupabaseBrowserConfig>): SupabaseBrowserConfig {
  const publicConfig = getAuthPublicConfig();
  const supabaseUrl =
    config?.supabaseUrl?.trim() || publicConfig.supabaseUrl;
  const supabaseAnonKey =
    config?.supabaseAnonKey?.trim() || publicConfig.supabaseAnonKey;
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
