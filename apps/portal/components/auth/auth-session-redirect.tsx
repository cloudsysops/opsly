'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
} from '@/lib/auth-recovery'
import {
  isLoginSurfacePath,
  isRecoverySurfacePath,
} from '../../../../lib/runtime/src/tenant-auth-surface'

const PORTAL_AUTH_SURFACE = {
  entryPaths: ['/', '/login'],
  loginPaths: ['/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/update-password'],
  authPrefixes: ['/login/'],
} as const

/** Forwards Supabase invite/recovery tokens on `/` and `/login` to the correct auth page. */
export function AuthSessionRedirect(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!isLoginSurfacePath(pathname, PORTAL_AUTH_SURFACE)) {
      return
    }
    if (isRecoverySurfacePath(pathname, PORTAL_AUTH_SURFACE)) {
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
