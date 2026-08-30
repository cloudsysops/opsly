'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { inviteActivationPathFromUrl, isInviteLink, isRecoveryLink } from '@/lib/auth-recovery'
import {
  isLoginSurfacePath,
  isRecoverySurfacePath,
} from '../../../../lib/runtime/src/tenant-auth-surface'

const ADMIN_AUTH_SURFACE = {
  entryPaths: ['/', '/login'],
  loginPaths: ['/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/update-password'],
  authPrefixes: ['/login/'],
} as const

/**
 * When Supabase emails use /login#access_token=… (Site URL fallback), keep the
 * recovery payload on /login so the login page can render the recovery flow.
 * Invite links go to /invite/[token] with email preserved.
 */
export function AuthSessionRedirect(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const url = new URL(window.location.href)
    if (!isLoginSurfacePath(pathname, ADMIN_AUTH_SURFACE)) {
      return
    }
    if (isRecoverySurfacePath(pathname, ADMIN_AUTH_SURFACE)) {
      return
    }
    if (isInviteLink(url)) {
      window.location.replace(inviteActivationPathFromUrl(url, window.location.origin))
      return
    }
    if (!isRecoveryLink(url)) {
      return
    }
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return
    }
    window.location.replace(`/login${url.search}${url.hash}`)
  }, [pathname])

  return null
}
