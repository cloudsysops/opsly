export function readRuntimeEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function getRuntimeApiBaseUrl(): string {
  const explicit = readRuntimeEnv('API_URL') || readRuntimeEnv('NEXT_PUBLIC_API_URL');
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const rawDomain =
    readRuntimeEnv('PLATFORM_DOMAIN') || readRuntimeEnv('NEXT_PUBLIC_PLATFORM_DOMAIN');
  const domain = rawDomain.replace(/^https?:\/\//u, '').replace(/\/$/u, '');
  return domain ? `https://api.${domain}` : '';
}

export function getRuntimeSupabasePublicConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
} {
  const supabaseUrl =
    readRuntimeEnv('SUPABASE_URL') || readRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey =
    readRuntimeEnv('SUPABASE_ANON_KEY') ||
    readRuntimeEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    readRuntimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    supabaseUrl,
    supabaseAnonKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

export function getRuntimeSupportEmail(): string {
  return readRuntimeEnv('SUPPORT_EMAIL') || readRuntimeEnv('NEXT_PUBLIC_SUPPORT_EMAIL');
}
