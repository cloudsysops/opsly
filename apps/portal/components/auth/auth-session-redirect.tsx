'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
} from '@/lib/auth-recovery'

/** Forwards Supabase invite/recovery tokens on `/` and `/login` to the correct auth page. */
export function AuthSessionRedirect(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/login/')) {
      return
    }
    if (pathname.startsWith('/auth/recovery')) {
      return
    }

    const url = new URL(window.location.href)
    if (isInviteLink(url)) {
      window.location.replace(inviteActivationPathFromUrl(url, window.location.origin))
      return
    }
    if (!isRecoveryLink(url)) {
      return
    }

    window.location.replace(`/auth/recovery${url.search}${url.hash}`)
  }, [pathname])

  return null
}
