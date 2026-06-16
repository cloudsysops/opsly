'use client';

import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import {
  inviteActivationErrorMessage,
  validateInviteActivationForm,
} from '@/lib/invite-activation-validation';
import { createClient } from '@/lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

type FormSubmitEvent = Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0];

export function InviteActivate() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenRaw = typeof params.token === 'string' ? params.token : '';
  const token = useMemo(() => decodeURIComponent(tokenRaw), [tokenRaw]);
  const email = searchParams.get('email') ?? '';
  const code = searchParams.get('code');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [passkeyErr, setPasskeyErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyReady, setPasskeyReady] = useState(false);

  const displayName = email.includes('@') ? email.split('@')[0] : 'equipo';

  async function onSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    setErr(null);
    setPasskeyErr(null);
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
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setErr(exchangeError.message);
          return;
        }
      } else {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'invite',
        });
        if (otpError) {
          setErr(otpError.message);
          return;
        }
      }
      const { error: pwError } = await supabase.auth.updateUser({
        password,
      });
      if (pwError) {
        setErr(pwError.message);
        return;
      }
      setPasskeyReady(true);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'No se pudo activar la cuenta');
    } finally {
      setLoading(false);
    }
  }

  async function onRegisterPasskey(): Promise<void> {
    setPasskeyErr(null);
    setPasskeyLoading(true);
    try {
      const supabase = createClient();
      const { error: registerError } = await supabase.auth.registerPasskey();
      if (registerError) {
        setPasskeyErr(registerError.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setPasskeyErr(error instanceof Error ? error.message : 'No se pudo activar la passkey');
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ops-bg px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-mono text-xl font-semibold text-ops-green">Opsly</h1>
          <p className="mt-4 font-sans text-lg text-neutral-100">
            Bienvenido a Opsly, {displayName}
          </p>
          <p className="mt-2 font-sans text-sm text-ops-gray">
            Tu espacio de automatización está listo
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {err ? (
            <div className="rounded border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red">
              {err}
            </div>
          ) : null}
          {passkeyErr ? (
            <div className="rounded border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red">
              {passkeyErr}
            </div>
          ) : null}
          <div>
            <label
              htmlFor="pw"
              className="mb-1 block text-xs uppercase tracking-wide text-ops-gray"
            >
              Nueva contraseña
            </label>
            <PasswordInput
              id="pw"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-terminal-caret bg-ops-bg/80"
              required
              minLength={8}
            />
          </div>
          <div>
            <label
              htmlFor="pw2"
              className="mb-1 block text-xs uppercase tracking-wide text-ops-gray"
            >
              Confirmar contraseña
            </label>
            <PasswordInput
              id="pw2"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-terminal-caret bg-ops-bg/80"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Activando...' : 'Activar mi cuenta'}
          </Button>
          {passkeyReady ? (
            <Button
              type="button"
              variant="default"
              className="w-full"
              onClick={() => void onRegisterPasskey()}
              disabled={passkeyLoading}
            >
              {passkeyLoading ? 'Guardando huella...' : 'Guardar acceso con huella'}
            </Button>
          ) : null}
        </form>
        {passkeyReady ? (
          <p className="text-center text-xs leading-relaxed text-ops-gray">
            Ya tienes la contraseña creada. Si tu navegador lo soporta, puedes registrar una passkey para entrar con huella o Touch ID.
          </p>
        ) : null}
      </div>
    </div>
  );
}
