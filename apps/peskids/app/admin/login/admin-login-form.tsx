'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { Button } from '@/components/ui/button';
import type { AuthPublicConfig } from '@/lib/auth-public-config';
import { authFetchErrorMessage, isAuthFetchError } from '@/lib/auth-login-messages';
import { buildRecoveryRedirectTo } from '@/lib/auth-recovery';
import { isStaffUser } from '@/lib/staff-user';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { createClient } from '@/lib/supabase-browser';

function resolvePostLoginPath(role: string | undefined): string {
  if (role === 'teacher') {
    return '/teacher/dashboard';
  }
  return '/admin';
}

export type AdminLoginFormProps = {
  authConfig: AuthPublicConfig;
};

export function AdminLoginForm({ authConfig }: AdminLoginFormProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabaseConfig = useMemo(
    () => ({
      supabaseUrl: authConfig.supabaseUrl,
      supabaseAnonKey: authConfig.supabaseAnonKey,
    }),
    [authConfig.supabaseAnonKey, authConfig.supabaseUrl]
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      setError(callbackError);
    }
  }, [searchParams]);

  async function onForgotPassword(): Promise<void> {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Escribe tu email arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».');
      return;
    }
    if (!authConfig.configured) {
      setError(authFetchErrorMessage());
      return;
    }
    setResetLoading(true);
    setError('');
    setResetSent(false);
    try {
      const supabase = createClient(supabaseConfig);
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://peskids.op-sly.com';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: buildRecoveryRedirectTo(origin),
      });
      if (resetError) {
        setError(isAuthFetchError(resetError.message) ? authFetchErrorMessage() : resetError.message);
        return;
      }
      setResetSent(true);
    } catch {
      setError(authFetchErrorMessage());
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSent(false);

    try {
      if (!authConfig.configured) {
        setError(authFetchErrorMessage());
        return;
      }
      const supabase = createClient(supabaseConfig);
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(isAuthFetchError(signError.message) ? authFetchErrorMessage() : signError.message);
        return;
      }
      const user = data.user;
      if (!user || !isStaffUser(user)) {
        await supabase.auth.signOut();
        setError(
          'Esta cuenta no tiene acceso al panel Peskids. Solicita acceso al equipo de Peskids.'
        );
        return;
      }
      router.push(resolvePostLoginPath(tenantRoleFromUserMetadata(user)));
      router.refresh();
    } catch {
      setError(authFetchErrorMessage());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pk-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-pk-border bg-white p-8 shadow-card">
        <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-pk-border bg-pk-muted px-2 py-2">
          <Link
            href="/admin/login"
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-pk-ink shadow-sm transition hover:bg-pk-snow"
          >
            Panel administrativo
          </Link>
          <Link
            href="/teacher/login"
            className="rounded-full px-4 py-2 text-xs font-semibold text-pk-sub transition hover:bg-white hover:text-pk-ink"
          >
            Panel de profesores
          </Link>
        </div>
        <div className="mb-6 flex justify-center">
          <PeskidsLogo size={72} />
        </div>
        <h1 className="font-display text-center text-xl font-semibold text-pk-ink">
          Acceso al panel
        </h1>
        <p className="mt-2 text-center text-sm text-pk-sub">
          Ingresa con el email de tu cuenta de staff Peskids.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pk-input mt-1"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pk-input mt-1"
              autoComplete="current-password"
              required
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm font-medium text-pk-mint underline-offset-4 hover:underline disabled:opacity-50"
              disabled={resetLoading}
              onClick={() => void onForgotPassword()}
            >
              {resetLoading ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>
          {resetSent ? (
            <p className="rounded-lg border border-pk-mint/40 bg-pk-mint/10 px-3 py-2 text-sm text-pk-ink">
              Revisa tu correo. El enlace te llevará a elegir una contraseña nueva.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              'Acceder al dashboard'
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-pk-sub">
          Si tu contraseña no sirve, usa «¿Olvidaste tu contraseña?» para generar un enlace nuevo.
        </p>
      </div>
    </div>
  );
}
