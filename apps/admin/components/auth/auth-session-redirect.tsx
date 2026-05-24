'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { inviteActivationPathFromUrl, isInviteLink, isRecoveryLink } from '@/lib/auth-recovery'

/**
 * When Supabase emails use /login#access_token=… (Site URL fallback), forward to
 * /auth/recovery before middleware or login UI drop the hash. Invite links go to
 * /invite/[token] with email preserved.
 */
export function AuthSessionRedirect(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const url = new URL(window.location.href)
    if (pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/login/')) {
      return
    }
    if (isInviteLink(url)) {
      window.location.replace(inviteActivationPathFromUrl(url, window.location.origin))
      return
    }
    if (!isRecoveryLink(url)) {
      return
    }
    if (pathname.startsWith('/auth/recovery')) {
      return
    }
    const target = `/auth/recovery${url.search}${url.hash}`
    window.location.replace(target)
  }, [pathname])

  return null
}
