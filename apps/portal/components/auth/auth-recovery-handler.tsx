'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  currentPortalRecoveryTarget,
  forwardRecoveryToOrigin,
  metadataFromJwtAccessToken,
  recoveryTargetFromMetadata,
} from '@/lib/auth-recovery';
import {
  markPasswordRecoveryActive,
  PASSWORD_RECOVERY_CALLBACK_PARAM,
} from '@/lib/password-recovery-session';
import { createClient } from '@/lib/supabase';

const RECOVERY_FAILED_MESSAGE =
  'No pudimos validar el enlace. Ábrelo en el mismo navegador donde solicitaste la recuperación, o solicita un enlace nuevo desde login.';

interface AuthRecoveryHandlerProps {
  updatePasswordPath?: string;
  loggedInRedirectPath?: string;
  loginPath?: string;
}

export function AuthRecoveryHandler({
  updatePasswordPath = '/update-password',
  loggedInRedirectPath = '/dashboard',
  loginPath = '/login',
}: AuthRecoveryHandlerProps): React.ReactElement {
  const router = useRouter();
  const finishedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Validando enlace de recuperación…');

  useEffect(() => {
    const supabase = createClient();

    function showError(message: string): void {
      setStatus('error');
      setErrorMessage(message);
    }

    function routeAwayIfWrongApp(meta: Record<string, unknown>): boolean {
      const target = recoveryTargetFromMetadata(meta);
      if (target.app === 'peskids_staff') {
        setLoadingMessage('Redirigiendo a tu portal correcto…');
        forwardRecoveryToOrigin(target.origin);
        return true;
      }
      return false;
    }

    function finishToUpdatePassword(): void {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      markPasswordRecoveryActive();
      router.replace(updatePasswordPath);
    }

    function redirectToServerCallback(authCode: string): void {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('code', authCode);
      callbackUrl.searchParams.set('next', '/auth/recovery');
      window.location.replace(callbackUrl.toString());
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const hash = url.hash.replace(/^#/, '');
    const recoveryIntent = url.searchParams.get(PASSWORD_RECOVERY_CALLBACK_PARAM) === '1';

    if (hash) {
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get('error') && !code) {
        const hashErrorCode = hashParams.get('error_code') ?? '';
        const description =
          hashParams.get('error_description')?.replace(/\+/g, ' ') ?? hashParams.get('error');
        showError(
          hashErrorCode === 'otp_expired'
            ? 'El enlace expiró. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».'
            : (description ?? 'Enlace inválido.')
        );
        return undefined;
      }
      const accessToken = hashParams.get('access_token');
      if (accessToken && routeAwayIfWrongApp(metadataFromJwtAccessToken(accessToken))) {
        return undefined;
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        const meta = {
          ...((session.user.app_metadata ?? {}) as Record<string, unknown>),
          ...((session.user.user_metadata ?? {}) as Record<string, unknown>),
        };
        if (!routeAwayIfWrongApp(meta)) {
          finishToUpdatePassword();
        }
      }
    });

    void (async () => {
      if (recoveryIntent) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const meta = {
            ...((session.user.app_metadata ?? {}) as Record<string, unknown>),
            ...((session.user.user_metadata ?? {}) as Record<string, unknown>),
          };
          if (!routeAwayIfWrongApp(meta)) {
            finishToUpdatePassword();
          }
          return;
        }
        showError(RECOVERY_FAILED_MESSAGE);
        return;
      }

      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user) {
        router.replace(loggedInRedirectPath);
        return;
      }

      if (code) {
        setLoadingMessage('Preparando recuperación segura…');
        redirectToServerCallback(code);
        return;
      }

      if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const meta = {
            ...((session.user.app_metadata ?? {}) as Record<string, unknown>),
            ...((session.user.user_metadata ?? {}) as Record<string, unknown>),
          };
          if (!routeAwayIfWrongApp(meta)) {
            finishToUpdatePassword();
          }
          return;
        }
        showError('Enlace inválido o expirado. Solicita uno nuevo desde login.');
        return;
      }

      const expected = currentPortalRecoveryTarget();
      if (window.location.origin.replace(/\/$/, '') !== expected.origin.replace(/\/$/, '')) {
        forwardRecoveryToOrigin(expected.origin);
        return;
      }

      showError('Abre el enlace del correo o solicita uno nuevo desde login.');
    })();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loggedInRedirectPath, router, updatePasswordPath]);

  if (status === 'error' && errorMessage) {
    return (
      <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-ops-border/80 bg-ops-surface/60 p-6 shadow-xl shadow-black/30">
          <p role="alert" className="text-center text-sm text-ops-red">
            {errorMessage}
          </p>
          <Link
            href={loginPath}
            className="block text-center text-sm font-medium text-ops-green hover:underline"
          >
            Volver a login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-ops-green" aria-hidden />
      <p className="text-sm text-neutral-500">{loadingMessage}</p>
    </main>
  );
}
