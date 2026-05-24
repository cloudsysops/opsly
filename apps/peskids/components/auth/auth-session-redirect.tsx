'use client'

import { useEffect } from 'react'
import { inviteActivationPathFromUrl, isInviteLink, isRecoveryLink } from '@/lib/auth-recovery'

/**
 * Recovery links that hit the public landing or admin login are forwarded to /auth/recovery.
 */
export function AuthSessionRedirect(): null {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    const isLanding = url.pathname === '/'
    const isAdminLogin = url.pathname === '/admin/login' || url.pathname.startsWith('/admin/login/')
    const isAuthRoute = url.pathname.startsWith('/auth/')
    if (!isLanding && !isAdminLogin && !isAuthRoute) {
      return
    }

    if (isInviteLink(url)) {
      window.location.replace(inviteActivationPathFromUrl(url, window.location.origin))
      return
    }

    if (!isRecoveryLink(url)) {
      return
    }

    const target = `/auth/recovery${url.search}${url.hash}`
    window.location.replace(target)
  }, [])

  return null
}
