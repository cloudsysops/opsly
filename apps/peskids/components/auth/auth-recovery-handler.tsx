'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  currentPeskidsRecoveryTarget,
  forwardRecoveryToOrigin,
  metadataFromJwtAccessToken,
  recoveryTargetFromMetadata,
} from '@/lib/auth-recovery';

type Props = {
  updatePasswordPath?: string;
};

/**
 * Completes Supabase recovery on /auth/recovery (not the public landing).
 * Forwards to portal/admin if the JWT belongs to another app.
 */
export function AuthRecoveryHandler({
  updatePasswordPath = '/admin/update-password',
}: Props): React.ReactElement {
  const router = useRouter();
  const [message, setMessage] = useState('Validando enlace de recuperación…');

  useEffect(() => {
    const supabase = createClient();
    const expected = currentPeskidsRecoveryTarget();

    const routeAwayIfWrongApp = (meta: Record<string, unknown>): boolean => {
      const target = recoveryTargetFromMetadata(meta);
      if (target.app !== 'peskids_staff') {
        setMessage('Redirigiendo a tu portal correcto…');
        forwardRecoveryToOrigin(target.origin);
        return true;
      }
      return false;
    };

    const finishToUpdatePassword = (): void => {
      router.replace(updatePasswordPath);
    };

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const hash = url.hash.replace(/^#/, '');

    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      if (accessToken && routeAwayIfWrongApp(metadataFromJwtAccessToken(accessToken))) {
        return;
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
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
        if (data.user) {
          const meta = {
            ...((data.user.app_metadata ?? {}) as Record<string, unknown>),
            ...((data.user.user_metadata ?? {}) as Record<string, unknown>),
          };
          if (routeAwayIfWrongApp(meta)) {
            return;
          }
        }
        finishToUpdatePassword();
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
        setMessage('Enlace inválido o expirado. Solicita uno nuevo desde /admin/login.');
        return;
      }

      if (window.location.origin.replace(/\/$/, '') !== expected.origin.replace(/\/$/, '')) {
        forwardRecoveryToOrigin(expected.origin);
      }
    })();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, updatePasswordPath]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-pk-mint" aria-hidden />
      <p className="text-sm text-pk-sub">{message}</p>
    </div>
  );
}
