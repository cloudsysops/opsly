'use client'

import { useEffect } from 'react'
import { isRecoveryLink } from '@/lib/auth-recovery'

/** Forwards recovery tokens on `/` to `/auth/recovery`. */
export function AuthSessionRedirect(): null {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    if (url.pathname !== '/' && url.pathname !== '/login') {
      return
    }

    if (!isRecoveryLink(url)) {
      return
    }

    window.location.replace(`/auth/recovery${url.search}${url.hash}`)
  }, [])

  return null
}
