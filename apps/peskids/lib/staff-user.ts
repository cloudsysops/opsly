import type { User } from '@supabase/supabase-js'

const STAFF_ROLES = new Set(['owner', 'admin', 'support', 'teacher'])

function getTenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase()
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

/** Client-safe: no imports from next/headers. */
export function isStaffUser(user: User): boolean {
  const userMeta = metadataRecord(user.user_metadata)
  const appMeta = metadataRecord(user.app_metadata)
  const role = normalize(userMeta.role) || normalize(appMeta.role)
  const tenantSlug = normalize(userMeta.tenant_slug) || normalize(appMeta.tenant_slug)

  if (tenantSlug && tenantSlug !== getTenantSlug()) {
    return false
  }
  if (userMeta.is_superuser === true || appMeta.is_superuser === true) {
    return true
  }
  return STAFF_ROLES.has(role)
}
