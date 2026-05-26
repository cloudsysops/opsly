'use client';

import { Loader2, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PeskidsLockup } from '@/components/brand/peskids-logo';
import { Button } from '@/components/ui/button';
import { buildRecoveryRedirectTo } from '@/lib/auth-recovery';
import { isStaffUser } from '@/lib/staff-user';
import { createClient } from '@/lib/supabase-browser';
import { tenantRoleFromUserMetadata } from '../../../../../lib/runtime/src/tenant-identity';

function browserSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function authFetchErrorMessage(): string {
  return 'El acceso al panel no está configurado correctamente en este despliegue. Usa recuperación o avisa al equipo.';
}

function resolvePostLoginPath(role: string | undefined): string {
  if (role === 'teacher') {
    return '/teacher/dashboard';
  }
  return '/admin';
}

export function TeacherLogin(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get('next')?.trim() ?? '', [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const destination = next.startsWith('/') ? next : '/teacher/dashboard';

  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      setError(callbackError);
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const role = tenantRoleFromUserMetadata(data.session.user);
        router.replace(resolvePostLoginPath(role));
        router.refresh();
      }
    });
  }, [router]);

  async function onForgotPassword(): Promise<void> {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Escribe tu email arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».');
      return;
    }
    if (!browserSupabaseConfigured()) {
      setError(authFetchErrorMessage());
      return;
    }
    setResetLoading(true);
    setError('');
    setResetSent(false);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://peskids.op-sly.com';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: buildRecoveryRedirectTo(origin),
      });
      if (resetError) {
        setError(
          resetError.message.toLowerCase().includes('fetch')
            ? authFetchErrorMessage()
            : resetError.message
        );
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
      if (!browserSupabaseConfigured()) {
        setError(authFetchErrorMessage());
        return;
      }
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(
          signError.message.toLowerCase().includes('fetch')
            ? authFetchErrorMessage()
            : signError.message
        );
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
      router.push(destination);
      router.refresh();
    } catch {
      setError(authFetchErrorMessage());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(60,190,190,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,186,75,0.2),_transparent_22%),linear-gradient(180deg,#f6fcfe_0%,#eff8fb_40%,#eaf5f9_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-7rem] h-56 w-56 rounded-full bg-pk-primary/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-pk-secondary/20 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-64 w-64 rounded-full bg-pk-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <section className="flex flex-col justify-between rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-[0_30px_90px_rgba(11,84,102,0.10)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="space-y-8">
              <PeskidsLockup height={54} className="items-center" />

              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-pk-primary/15 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-pk-mutedText shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-pk-primary" aria-hidden />
                  Acceso profesores
                </div>

                <div className="max-w-xl space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-pk-ink sm:text-5xl lg:text-6xl">
                    Entrar al panel de profesores
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-pk-sub sm:text-lg">
                    Acceso profesional para revisar clases, estudiantes y seguimientos. El panel
                    administrativo sigue separado y cada rol entra por su ruta.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                'Email y contraseña',
                'Sesión segura con Supabase',
                'Redirección automática al dashboard',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-sm font-medium text-pk-ink shadow-[0_12px_30px_rgba(11,84,102,0.06)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-pk-primary/10 bg-white p-6 shadow-[0_30px_90px_rgba(11,84,102,0.14)] sm:p-8 lg:p-10">
            <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-pk-secondary/15 blur-2xl" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pk-primary/10 text-pk-primary">
                  <ShieldCheck className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pk-mutedText">
                    Portal seguro
                  </p>
                  <p className="text-sm text-pk-sub">Profesores y admin se manejan por rol</p>
                </div>
              </div>

              <div className="mb-5 flex items-center gap-2 rounded-full border border-pk-primary/15 bg-pk-surface/70 p-1">
                <Link
                  href="/admin/login"
                  className="rounded-full px-4 py-2 text-xs font-semibold text-pk-sub transition hover:bg-white hover:text-pk-ink"
                >
                  Panel administrativo
                </Link>
                <Link
                  href="/teacher/login"
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-pk-ink shadow-sm transition hover:bg-pk-snow"
                >
                  Panel de profesores
                </Link>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
                  Accede con tu cuenta
                </h2>
                <p className="text-sm leading-6 text-pk-sub sm:text-base">
                  Si ya tienes una sesión activa, te llevamos directamente al panel correcto. Si
                  olvidaste tu contraseña, puedes regenerarla desde aquí.
                </p>
              </div>

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
                <Button
                  type="submit"
                  className="h-12 w-full rounded-full text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Entrando…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" aria-hidden />
                      Acceder al panel
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-pk-sub">
                Si tu contraseña no sirve, usa el enlace de recuperación para generar una nueva.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
