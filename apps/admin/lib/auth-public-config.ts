import { getRuntimeSupabasePublicConfig } from '@/lib/runtime-env';

/** Public Supabase auth settings resolved on the server at runtime. */
export type AuthPublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
};

export function getAuthPublicConfig(): AuthPublicConfig {
  return getRuntimeSupabasePublicConfig();
}
