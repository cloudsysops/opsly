'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  currentPeskidsRecoveryTarget,
  forwardRecoveryToOrigin,
  metadataFromJwtAccessToken,
  recoveryTargetFromMetadata,
} from '@/lib/auth-recovery';
import {
  markPasswordRecoveryActive,
  PASSWORD_RECOVERY_CALLBACK_PARAM,
} from '@/lib/password-recovery-session';
import { createClient } from '@/lib/supabase-browser';

const RECOVERY_FAILED_MESSAGE =
  'No pudimos validar el enlace. Ábrelo en el mismo navegador donde solicitaste la recuperación, o solicita un enlace nuevo desde login.';

interface AuthRecoveryHandlerProps {
  updatePasswordPath?: string;
  loggedInRedirectPath?: string;
  loginPath?: string;
}

/**
 * Completes Supabase recovery on /auth/recovery (not the public landing).
 * Forwards to portal/admin if the JWT belongs to another app.
 */
export function AuthRecoveryHandler({
  updatePasswordPath = '/admin/update-password',
  loggedInRedirectPath = '/admin',
  loginPath = '/admin/login',
}: AuthRecoveryHandlerProps): React.ReactElement {
  const router = useRouter();
  const finishedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const expected = currentPeskidsRecoveryTarget();
    const recoveryUrl = new URL(window.location.href);
    const recoveryParams = new URLSearchParams(window.location.search);
    const callbackCode = recoveryParams.get('code');
    const recoveryIntent = recoveryParams.get(PASSWORD_RECOVERY_CALLBACK_PARAM) === '1';

    function showError(message: string): void {
      setStatus('error');
      setErrorMessage(message);
    }

    function routeAwayIfWrongApp(meta: Record<string, unknown>): boolean {
      const target = recoveryTargetFromMetadata(meta);
      if (target.app !== 'peskids_staff') {
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

    if (callbackCode) {
      redirectToServerCallback(callbackCode);
      return undefined;
    }

    const hash = recoveryUrl.hash.replace(/^#/, '');
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      if (accessToken && routeAwayIfWrongApp(metadataFromJwtAccessToken(accessToken))) {
        return undefined;
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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

      if (window.location.origin.replace(/\/$/, '') !== expected.origin.replace(/\/$/, '')) {
        forwardRecoveryToOrigin(expected.origin);
        return;
      }

      showError('Abre el enlace del correo de recuperación o solicita uno nuevo desde login.');
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, [loggedInRedirectPath, router, updatePasswordPath]);

  if (status === 'error' && errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pk-bg px-4">
        <div className="w-full max-w-md rounded-2xl border border-pk-border bg-white p-8 shadow-card">
          <p className="text-center text-sm text-red-600">{errorMessage}</p>
          <Link
            href={loginPath}
            className="mt-4 block text-center text-sm font-medium text-pk-mint hover:underline"
          >
            Volver a login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-pk-bg">
      <Loader2 className="h-8 w-8 animate-spin text-pk-mint" aria-hidden />
      <p className="text-sm text-pk-sub">Validando enlace de recuperación…</p>
    </div>
  );
}
