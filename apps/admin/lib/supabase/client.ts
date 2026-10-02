import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

/**
 * Reads the public Supabase config baked into the client bundle at build time.
 *
 * Production bakes NEXT_PUBLIC_SUPABASE_* as build ARGs (see apps/admin/Dockerfile).
 * Returns null when the build is missing them, which is a deployment defect — never
 * a valid configuration to paper over with a fake endpoint.
 */
export function readSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export class SupabaseConfigMissingError extends Error {
  constructor(missing: string[]) {
    super(
      `Supabase client config missing: ${missing.join(', ')}. ` +
        'These are baked at build time. Local dev: run scripts/ops/mission-control-live-preview.sh ' +
        'or export the variables before `next dev`. Production: set the build ARGs in ' +
        'apps/admin/Dockerfile and pass them from the deploy workflow.'
    );
    this.name = 'SupabaseConfigMissingError';
  }
}

const AUTH_OPTIONS = {
  detectSessionInUrl: true,
  flowType: 'pkce',
} as const;

/**
 * Returns a client only when the public config is present, otherwise null.
 * Use for optional reads (headers, avatars, session probes) that must degrade
 * quietly instead of taking the page down.
 */
export function createClient(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  if (!config) {
    return null;
  }
  return createBrowserClient(config.url, config.anonKey, { auth: AUTH_OPTIONS });
}

/**
 * For auth flows that cannot degrade. Throws instead of falling back to a
 * placeholder endpoint, so a misconfigured build reports the real cause rather
 * than an opaque "Invalid login credentials" from the wrong host.
 */
export function createRequiredAuthClient(): SupabaseClient {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (missing.length > 0) {
    throw new SupabaseConfigMissingError(missing);
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: AUTH_OPTIONS }
  );
}