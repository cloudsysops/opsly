import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function getUserFromAuthorizationHeader(request: Request): Promise<User | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return null;
  }
  const jwt = auth.slice('Bearer '.length).trim();
  if (jwt.length === 0) {
    return null;
  }

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
