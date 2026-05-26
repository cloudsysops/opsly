export type RecoveryApp = 'peskids_staff' | 'portal' | 'platform_admin'

export type RecoveryTarget = {
  app: RecoveryApp
  origin: string
  recoveryPath: string
  updatePasswordPath: string
}

export type TenantRecoveryRule = {
  tenantSlug: string
  app: RecoveryApp
  origin: string
  staffRoles: readonly string[]
  updatePasswordPath: string
}

export type RecoveryRoutingConfig = {
  portal: {
    origin: string
    updatePasswordPath: string
  }
  platformAdmin: {
    origin: string
    updatePasswordPath: string
    tenantSlugs?: readonly string[]
  }
  tenantRules: readonly TenantRecoveryRule[]
}

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

export function resolveRecoveryTargetFromMetadata(
  meta: Record<string, unknown>,
  config: RecoveryRoutingConfig
): RecoveryTarget {
  const tenantSlug = normalize(meta.tenant_slug)
  const role = normalize(meta.role)
  const isSuperuser = meta.is_superuser === true
  const platformAdminTenantSlugs = new Set(
    config.platformAdmin.tenantSlugs ?? ['intcloudsysops']
  )

  if (
    isSuperuser &&
    (role === 'admin' || tenantSlug === '' || platformAdminTenantSlugs.has(tenantSlug))
  ) {
    return {
      app: 'platform_admin',
      origin: config.platformAdmin.origin,
      recoveryPath: '/auth/recovery',
      updatePasswordPath: config.platformAdmin.updatePasswordPath,
    }
  }

  const tenantRule = config.tenantRules.find(
    (rule) => rule.tenantSlug === tenantSlug && rule.staffRoles.includes(role)
  )

  if (tenantRule) {
    return {
      app: tenantRule.app,
      origin: tenantRule.origin,
      recoveryPath: '/auth/recovery',
      updatePasswordPath: tenantRule.updatePasswordPath,
    }
  }

  return {
    app: 'portal',
    origin: config.portal.origin,
    recoveryPath: '/auth/recovery',
    updatePasswordPath: config.portal.updatePasswordPath,
  }
}

export function buildRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/auth/recovery`
}

function inviteAuthParams(url: URL): URLSearchParams | null {
  const hash = url.hash.replace(/^#/, '')
  if (!hash) {
    return null
  }
  return new URLSearchParams(hash)
}

function hashAuthParams(url: URL): URLSearchParams | null {
  const hash = url.hash.replace(/^#/, '')
  if (!hash) {
    return null
  }
  return new URLSearchParams(hash)
}

export function isRecoveryLink(url: URL): boolean {
  if (url.searchParams.get('code')) {
    return true
  }
  if (url.searchParams.get('type') === 'recovery') {
    return true
  }
  const params = hashAuthParams(url)
  if (!params) {
    return false
  }
  if (params.get('type') === 'recovery' || Boolean(params.get('access_token'))) {
    return true
  }
  const errorCode = params.get('error_code') ?? ''
  if (
    params.get('error') &&
    (errorCode.startsWith('otp') || errorCode === 'flow_state_expired')
  ) {
    return true
  }
  return false
}

export function isInviteLink(url: URL): boolean {
  if (url.searchParams.get('type')?.toLowerCase() === 'invite') {
    return true
  }

  const token =
    url.searchParams.get('token') ||
    url.searchParams.get('token_hash') ||
    url.searchParams.get('tokenHash')
  if (token && url.searchParams.get('email')) {
    return true
  }

  const params = inviteAuthParams(url)
  if (!params) {
    return false
  }

  if (params.get('type')?.toLowerCase() === 'invite') {
    return true
  }

  const hashToken =
    params.get('token') || params.get('token_hash') || params.get('tokenHash')
  return Boolean(hashToken && params.get('email'))
}

export function inviteActivationPathFromUrl(url: URL, fallbackOrigin: string): string {
  const base = fallbackOrigin.replace(/\/$/, '')
  const params = inviteAuthParams(url)
  const token =
    url.searchParams.get('token') ||
    url.searchParams.get('token_hash') ||
    url.searchParams.get('tokenHash') ||
    params?.get('token') ||
    params?.get('token_hash') ||
    params?.get('tokenHash') ||
    ''
  const email = url.searchParams.get('email') || params?.get('email') || ''
  const tokenPart = token ? `/${encodeURIComponent(token)}` : ''
  const emailPart = email ? `?email=${encodeURIComponent(email)}` : ''
  return `${base}/invite${tokenPart}${emailPart}`
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
