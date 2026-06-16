'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  currentPortalRecoveryTarget,
  forwardRecoveryToOrigin,
  metadataFromJwtAccessToken,
  recoveryTargetFromMetadata,
} from '@/lib/auth-recovery'
import { createClient } from '@/lib/supabase'

type Props = {
  updatePasswordPath?: string
}

export function AuthRecoveryHandler({
  updatePasswordPath = '/update-password',
}: Props): React.ReactElement {
  const router = useRouter()
  const [message, setMessage] = useState('Validando enlace de recuperación…')

  useEffect(() => {
    const supabase = createClient()

    const routeAwayIfWrongApp = (meta: Record<string, unknown>): boolean => {
      const target = recoveryTargetFromMetadata(meta)
      if (target.app === 'peskids_staff') {
        setMessage('Redirigiendo a tu portal correcto…')
        forwardRecoveryToOrigin(target.origin)
        return true
      }
      return false
    }

    const finishToUpdatePassword = (): void => {
      router.replace(updatePasswordPath)
    }

    const redirectToServerCallback = (authCode: string): void => {
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('code', authCode)
      callbackUrl.searchParams.set('next', '/auth/recovery')
      window.location.replace(callbackUrl.toString())
    }

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const hash = url.hash.replace(/^#/, '')

    if (hash) {
      const hashParams = new URLSearchParams(hash)
      if (hashParams.get('error') && !code) {
        const hashErrorCode = hashParams.get('error_code') ?? ''
        const description =
          hashParams.get('error_description')?.replace(/\+/g, ' ') ?? hashParams.get('error')
        setMessage(
          hashErrorCode === 'otp_expired'
            ? 'El enlace expiró. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».'
            : (description ?? 'Enlace inválido.')
        )
        return
      }
      const accessToken = hashParams.get('access_token')
      if (accessToken && routeAwayIfWrongApp(metadataFromJwtAccessToken(accessToken))) {
        return
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        const meta = {
          ...((session.user.app_metadata ?? {}) as Record<string, unknown>),
          ...((session.user.user_metadata ?? {}) as Record<string, unknown>),
        }
        if (!routeAwayIfWrongApp(meta)) {
          finishToUpdatePassword()
        }
      }
    })

    void (async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession()

      if (existingSession?.user) {
        const meta = {
          ...((existingSession.user.app_metadata ?? {}) as Record<string, unknown>),
          ...((existingSession.user.user_metadata ?? {}) as Record<string, unknown>),
        }
        if (!routeAwayIfWrongApp(meta)) {
          finishToUpdatePassword()
        }
        return
      }

      if (code) {
        setMessage('Preparando recuperacion segura…')
        redirectToServerCallback(code)
        return
      }

      if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          const meta = {
            ...((session.user.app_metadata ?? {}) as Record<string, unknown>),
            ...((session.user.user_metadata ?? {}) as Record<string, unknown>),
          }
          if (!routeAwayIfWrongApp(meta)) {
            finishToUpdatePassword()
          }
          return
        }
        setMessage('Enlace inválido o expirado. Solicita uno nuevo desde /login.')
        return
      }

      const expected = currentPortalRecoveryTarget()
      if (window.location.origin.replace(/\/$/, '') !== expected.origin.replace(/\/$/, '')) {
        forwardRecoveryToOrigin(expected.origin)
      }
    })()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, updatePasswordPath])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-ops-green" aria-hidden />
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  )
}
