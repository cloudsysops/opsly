import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let adminClientInstance: SupabaseClient<Database> | null = null;

function buildAdminClient(): SupabaseClient<Database> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const adminClient: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    if (!adminClientInstance) {
      adminClientInstance = buildAdminClient();
    }
    const value = Reflect.get(adminClientInstance, prop, adminClientInstance);
    if (typeof value === 'function') {
      return value.bind(adminClientInstance);
    }
    return value;
  },
});
