import type { User } from '@supabase/supabase-js'
import { isSuperAdminUser } from '@/lib/super-admin'

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

/** Portal cliente: tenants con invitación; no staff Peskids ni super-admin de plataforma. */
export function isPortalTenantUser(user: User): boolean {
  if (isSuperAdminUser(user)) {
    return false
  }

  const userMeta = metadataRecord(user.user_metadata)
  const appMeta = metadataRecord(user.app_metadata)
  const tenantSlug = normalize(userMeta.tenant_slug) || normalize(appMeta.tenant_slug)
  const role = normalize(userMeta.role) || normalize(appMeta.role)

  if (!tenantSlug) {
    return false
  }

  if (tenantSlug === 'peskids' && (PESKIDS_STAFF_ROLES.has(role) || role === 'owner')) {
    return false
  }

  return true
}
