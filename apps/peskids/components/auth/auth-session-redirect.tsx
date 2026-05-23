'use client'

import { useEffect } from 'react'
import { isRecoveryLink } from '@/lib/auth-recovery'

/**
 * Recovery links that hit the public landing (/) are forwarded to /auth/recovery.
 */
export function AuthSessionRedirect(): null {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    if (url.pathname !== '/' && !url.pathname.startsWith('/auth/')) {
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
