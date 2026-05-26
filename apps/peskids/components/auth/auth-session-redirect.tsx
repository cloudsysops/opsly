'use client'

import { useEffect } from 'react'
import { inviteActivationPathFromUrl, isInviteLink, isRecoveryLink } from '@/lib/auth-recovery'
import {
  isLoginSurfacePath,
  isRecoverySurfacePath,
} from '../../../../lib/runtime/src/tenant-auth-surface'

const PESKIDS_AUTH_SURFACE = {
  entryPaths: ['/', '/admin/login', '/teacher/login', '/support/login'],
  loginPaths: ['/admin/login', '/teacher/login', '/support/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/admin/update-password', '/teacher/update-password', '/support/update-password'],
  authPrefixes: ['/admin/login/', '/teacher/login/', '/support/login/'],
} as const

/**
 * Recovery links that hit the public landing or admin login are forwarded to /auth/recovery.
 */
export function AuthSessionRedirect(): null {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    if (!isLoginSurfacePath(url.pathname, PESKIDS_AUTH_SURFACE)) {
      return
    }
    if (isRecoverySurfacePath(url.pathname, PESKIDS_AUTH_SURFACE)) {
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
