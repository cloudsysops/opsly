import type { AuthError, User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase-server';

export type AuthCodeExchangeResult =
  | { ok: true; user: User }
  | { ok: false; error: AuthError | { message: string } };

export async function exchangeAuthCodeOnServer(code: string): Promise<AuthCodeExchangeResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, error: { message: 'auth_not_configured' } };
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return { ok: false, error };
  }
  if (!data.user) {
    return { ok: false, error: { message: 'missing_user' } };
  }
  return { ok: true, user: data.user };
}
