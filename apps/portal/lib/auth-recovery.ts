/** Recovery email targets and cross-app routing (shared Supabase project). */

export type RecoveryApp = 'peskids_staff' | 'portal' | 'platform_admin'

export type RecoveryTarget = {
  app: RecoveryApp
  origin: string
  recoveryPath: string
  updatePasswordPath: string
}

const PESKIDS_ORIGIN =
  process.env.NEXT_PUBLIC_PESKIDS_SITE_URL?.trim() || 'https://peskids.op-sly.com'
const PORTAL_ORIGIN =
  process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://portal.op-sly.com')
const ADMIN_ORIGIN =
  process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || 'https://admin.op-sly.com'

const PESKIDS_STAFF_ROLES = new Set(['admin', 'support', 'teacher'])

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function metadataRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {}
  }
  return meta as Record<string, unknown>
}

export function metadataFromJwtAccessToken(accessToken: string): Record<string, unknown> {
  const parts = accessToken.split('.')
  if (parts.length < 2) {
    return {}
  }
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as {
      user_metadata?: unknown
      app_metadata?: unknown
    }
    return {
      ...metadataRecord(payload.app_metadata),
      ...metadataRecord(payload.user_metadata),
    }
  } catch {
    return {}
  }
}

export function recoveryTargetFromMetadata(meta: Record<string, unknown>): RecoveryTarget {
  const tenantSlug = normalize(meta.tenant_slug)
  const role = normalize(meta.role)
  const isSuperuser = meta.is_superuser === true

  if (isSuperuser && (role === 'admin' || tenantSlug === '' || tenantSlug === 'intcloudsysops')) {
    return {
      app: 'platform_admin',
      origin: ADMIN_ORIGIN,
      recoveryPath: '/auth/recovery',
      updatePasswordPath: '/update-password',
    }
  }

  if (tenantSlug === 'peskids' && (PESKIDS_STAFF_ROLES.has(role) || role === 'owner')) {
    return {
      app: 'peskids_staff',
      origin: PESKIDS_ORIGIN,
      recoveryPath: '/auth/recovery',
      updatePasswordPath: '/admin/update-password',
    }
  }

  return {
    app: 'portal',
    origin: PORTAL_ORIGIN,
    recoveryPath: '/auth/recovery',
    updatePasswordPath: '/update-password',
  }
}

export function buildRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/auth/recovery`
}

export function currentPortalRecoveryTarget(): RecoveryTarget {
  return recoveryTargetFromMetadata({ tenant_slug: 'portal' })
}

export function isRecoveryLink(url: URL): boolean {
  if (url.searchParams.get('code')) {
    return true
  }
  if (url.searchParams.get('type') === 'recovery') {
    return true
  }
  const hash = url.hash.replace(/^#/, '')
  if (!hash) {
    return false
  }
  const params = new URLSearchParams(hash)
  return params.get('type') === 'recovery' || Boolean(params.get('access_token'))
}

export function forwardRecoveryToOrigin(targetOrigin: string): void {
  if (typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  const base = targetOrigin.replace(/\/$/, '')
  if (url.searchParams.get('code')) {
    const next = `${base}/auth/recovery?code=${encodeURIComponent(url.searchParams.get('code') ?? '')}`
    window.location.replace(next)
    return
  }
  if (url.hash) {
    window.location.replace(`${base}/auth/recovery${url.hash}`)
    return
  }
  window.location.replace(`${base}/auth/recovery`)
}
