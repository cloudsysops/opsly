/** Public Supabase auth settings — read on the server (runtime env from Doppler). */
export type AuthPublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
};

export function getAuthPublicConfig(): AuthPublicConfig {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim() ?? '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.SUPABASE_ANON_KEY?.trim() ??
    '';

  return {
    supabaseUrl,
    supabaseAnonKey,
    configured: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
  };
}
