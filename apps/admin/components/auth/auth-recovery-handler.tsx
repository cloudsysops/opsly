'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isSuperAdminUser } from '@/lib/super-admin'
import { createClient } from '@/lib/supabase/client'

export function AuthRecoveryHandler(): React.ReactElement {
  const router = useRouter()
  const [message, setMessage] = useState('Validando enlace de recuperación…')

  useEffect(() => {
    const supabase = createClient()

    const finishOrReject = (
      user: import('@supabase/supabase-js').User | null | undefined
    ): void => {
      if (!user || !isSuperAdminUser(user)) {
        setMessage('Esta cuenta no tiene acceso al admin Opsly. Usa el portal de tu tenant.')
        return
      }
      router.replace('/update-password')
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        finishOrReject(session.user)
      }
    })

    void (async () => {
      const url = new URL(window.location.href)
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
      const hashError = hashParams.get('error')
      const hashErrorCode = hashParams.get('error_code') ?? ''
      if (hashError && !url.searchParams.get('code')) {
        const description =
          hashParams.get('error_description')?.replace(/\+/g, ' ') ?? hashError
        setMessage(
          hashErrorCode === 'otp_expired'
            ? 'El enlace expiró. Solicita uno nuevo desde /login.'
            : description
        )
        return
      }

      const code = url.searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setMessage(error.message)
          return
        }
        finishOrReject(data.user)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        finishOrReject(session.user)
      } else {
        setMessage('Enlace inválido o expirado. Solicita uno nuevo desde /login.')
      }
    })()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-ops-green" aria-hidden />
      <p className="font-sans text-sm text-neutral-400">{message}</p>
    </div>
  )
}
