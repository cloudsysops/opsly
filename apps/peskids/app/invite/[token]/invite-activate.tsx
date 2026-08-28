'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  inviteActivationErrorMessage,
  validateInviteActivationForm,
} from '@/lib/invite-activation-validation';
import { recoveryTargetFromMetadata } from '@/lib/auth-recovery';
import { createClient } from '@/lib/supabase-browser';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

type FormSubmitEvent = Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0];

function targetPathForTenant(meta: Record<string, unknown>): string {
  const target = recoveryTargetFromMetadata(meta);
  if (target.app === 'platform_admin') {
    return `${target.origin.replace(/\/$/, '')}/dashboard`;
  }
  if (target.app === 'peskids_staff') {
    return `${target.origin.replace(/\/$/, '')}/admin`;
  }
  return `${target.origin.replace(/\/$/, '')}/dashboard`;
}

export function InviteActivate(): React.ReactElement {
  const params = useParams();
  const searchParams = useSearchParams();
  const tokenRaw = typeof params.token === 'string' ? params.token : '';
  const token = useMemo(() => decodeURIComponent(tokenRaw), [tokenRaw]);
  const email = searchParams.get('email') ?? '';
  const code = searchParams.get('code');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayName = email.includes('@') ? email.split('@')[0] : 'equipo';

  async function onSubmit(e: FormSubmitEvent): Promise<void> {
    e.preventDefault();
    setErr(null);
    const validation = validateInviteActivationForm({
      password,
      confirm,
      email,
      token,
    });
    if (validation) {
      setErr(inviteActivationErrorMessage(validation));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (code && code.length > 0) {
        const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setErr(exchangeError.message);
          return;
        }
        const meta = {
          ...((data.user?.app_metadata ?? {}) as Record<string, unknown>),
          ...((data.user?.user_metadata ?? {}) as Record<string, unknown>),
        };
        const redirectPath = targetPathForTenant(meta);
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) {
          setErr(pwError.message);
          return;
        }
        window.location.replace(redirectPath);
        return;
      }

      const { error: otpError, data } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'invite',
      });
      if (otpError) {
        setErr(otpError.message);
        return;
      }
      const meta = {
        ...((data.user?.app_metadata ?? {}) as Record<string, unknown>),
        ...((data.user?.user_metadata ?? {}) as Record<string, unknown>),
      };
      const redirectPath = targetPathForTenant(meta);
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        setErr(pwError.message);
        return;
      }
      window.location.replace(redirectPath);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'No se pudo activar la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pk-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-pk-border bg-pk-surface p-8 shadow-card">
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold text-pk-ink">Peskids</h1>
          <p className="mt-4 text-lg text-pk-ink">Bienvenido, {displayName}</p>
          <p className="mt-2 text-sm text-pk-sub">Crea tu contraseña para continuar.</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Nueva contraseña</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-pk-ink">Confirmar</span>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1"
            />
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando…' : 'Crear acceso'}
          </Button>
        </form>
      </div>
    </div>
  );
}
