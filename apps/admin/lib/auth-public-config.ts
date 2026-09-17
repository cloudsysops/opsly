/** Public Supabase auth settings resolved on the server at runtime. */
export type AuthPublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
};

function runtimeEnv(name: string): string {
  return process.env[name]?.trim() || '';
}

export function getAuthPublicConfig(): AuthPublicConfig {
  const supabaseUrl =
    runtimeEnv('SUPABASE_URL') ||
    runtimeEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey =
    runtimeEnv('SUPABASE_ANON_KEY') ||
    runtimeEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    runtimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    supabaseUrl,
    supabaseAnonKey,
    configured: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
  };
}
