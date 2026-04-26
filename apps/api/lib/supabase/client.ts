import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let serviceClient: SupabaseClient<Database> | null = null;

export function getServiceClient(): SupabaseClient<Database> {
  if (!serviceClient) {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    serviceClient = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serviceClient;
}
