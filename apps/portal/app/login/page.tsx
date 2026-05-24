'use client';

import type { FormEvent, ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  isValidPortalDemoLogin,
  PORTAL_DEMO_COOKIE,
  PORTAL_DEMO_MODE_COOKIE,
  PORTAL_DEMO_TENANT_SLUG,
} from '@/lib/demo-tenant';
import { buildRecoveryRedirectTo } from '@/lib/auth-recovery';
import { createClient } from '@/lib/supabase';

const ADMIN_LOGIN_URL = 'https://admin.op-sly.com/login';

function hashAuthErrorMessage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash);
  if (!params.get('error')) {
    return null;
  }
  const code = params.get('error_code') ?? '';
  const description =
    params.get('error_description')?.replace(/\+/g, ' ') ?? params.get('error') ?? 'Enlace inválido.';
  if (code === 'otp_expired') {
    return `El enlace de invitación o recuperación expiró (${description}). Solicita uno nuevo. Si eres administrador de Opsly, usa ${ADMIN_LOGIN_URL} (no el portal de clientes).`;
  }
  return description;
}

export default function LoginPage(): ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hashError, setHashError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    setHashError(hashAuthErrorMessage());
  }, []);

  const onForgotPassword = async (): Promise<void> => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Escribe tu email primero.');
      return;
    }
    setResetLoading(true);
    setError(null);
    setResetSent(false);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://portal.op-sly.com';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: buildRecoveryRedirectTo(origin),
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setResetSent(true);
    } catch {
      setError('No se pudo enviar el correo de recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setPasskeyError(null);
    setGoogleError(null);
    setLoading(true);
    try {
      if (isValidPortalDemoLogin(email, password, window.location.hostname)) {
        document.cookie = `${PORTAL_DEMO_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `${PORTAL_DEMO_MODE_COOKIE}=managed; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `opsly_portal_demo_tenant=${PORTAL_DEMO_TENANT_SLUG}; path=/; max-age=86400; SameSite=Lax`;
        router.push('/dashboard');
        router.refresh();
        return;
      }
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const onPasskeySignIn = async (): Promise<void> => {
    setError(null);
    setPasskeyError(null);
    setGoogleError(null);
    setPasskeyLoading(true);
    try {
      const supabase = createClient();
      const { error: passkeyErrorResult } = await supabase.auth.signInWithPasskey();
      if (passkeyErrorResult) {
        setPasskeyError(passkeyErrorResult.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setPasskeyError('No se pudo iniciar con passkey');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const onGoogleSignIn = async (): Promise<void> => {
    setError(null);
    setPasskeyError(null);
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=%2Fdashboard`
          : '/auth/callback?next=%2Fdashboard';
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (oauthError) {
        setGoogleError(oauthError.message);
      }
    } catch {
      setGoogleError('No se pudo iniciar con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main
      id="main-content"
      className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-12"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-sm focus:bg-ops-green focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ops-bg"
      >
        Saltar al formulario
      </a>
      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ops-gray">Opsly</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-100">
            Portal de cliente
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Inicia sesión con el email de tu invitación.
          </p>
        </div>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-4 rounded-lg border border-ops-border/80 bg-ops-surface/60 p-6 shadow-xl shadow-black/30 backdrop-blur-sm"
          aria-busy={loading}
        >
          {hashError ? (
            <p
              role="alert"
              className="rounded-sm border border-ops-amber-500/40 bg-ops-amber-500/10 px-3 py-2 text-sm text-amber-200"
            >
              {hashError}{' '}
              <a href={ADMIN_LOGIN_URL} className="font-medium text-ops-green underline">
                Ir al admin
              </a>
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-sm border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red"
            >
              {error}
            </p>
          ) : null}
          {passkeyError ? (
            <p
              role="alert"
              className="rounded-sm border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red"
            >
              {passkeyError}
            </p>
          ) : null}
          {googleError ? (
            <p
              role="alert"
              className="rounded-sm border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red"
            >
              {googleError}
            </p>
          ) : null}
          {resetSent ? (
            <p className="rounded-sm border border-ops-green/40 bg-ops-green/10 px-3 py-2 text-sm text-ops-green">
              Revisa tu correo. El enlace abre el portal Opsly para definir una contraseña nueva.
            </p>
          ) : null}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs uppercase tracking-wide text-ops-gray"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-bg/80 px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-ops-green focus:ring-2 focus:ring-ops-green/30"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs uppercase tracking-wide text-ops-gray"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-bg/80 px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-ops-green focus:ring-2 focus:ring-ops-green/30"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="text-sm text-ops-green underline-offset-4 hover:underline disabled:opacity-50"
                disabled={resetLoading}
                onClick={() => void onForgotPassword()}
              >
                {resetLoading ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              'Entrar'
            )}
          </Button>
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={() => void onPasskeySignIn()}
            disabled={passkeyLoading}
          >
            {passkeyLoading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Verificando huella…
              </>
            ) : (
              'Entrar con huella o passkey'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => void onGoogleSignIn()}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Redirigiendo a Google…
              </>
            ) : (
              'Entrar con Google'
            )}
          </Button>
        </form>
        <p className="text-center text-xs leading-relaxed text-ops-gray">
          Staff: invitación y contraseña. Familias: Google o invitación según el tenant.
        </p>
      </div>
    </main>
  );
}
