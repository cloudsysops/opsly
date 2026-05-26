import type { User } from '@supabase/supabase-js'
import {
  tenantRoleFromUserMetadata,
  tenantSlugFromUserMetadata,
} from '../../../lib/runtime/src/tenant-identity'

const STAFF_ROLES = new Set(['owner', 'admin', 'support', 'teacher'])
const OPERATIONAL_STAFF_ROLES = new Set(['owner', 'admin', 'support'])
const ADMIN_SURFACE_ROLES = new Set(['owner', 'admin'])
const SUPPORT_SURFACE_ROLES = new Set(['owner', 'admin', 'support'])
const TEACHER_SURFACE_ROLES = new Set(['owner', 'admin', 'teacher'])

function getTenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase()
}

/** Client-safe: no imports from next/headers. */
export function isStaffUser(user: User): boolean {
  const role = tenantRoleFromUserMetadata(user)
  const tenantSlug = tenantSlugFromUserMetadata(user)

  if (tenantSlug && tenantSlug !== getTenantSlug()) {
    return false
  }

  const userMeta = user.user_metadata && typeof user.user_metadata === 'object' && !Array.isArray(user.user_metadata)
    ? (user.user_metadata as Record<string, unknown>)
    : {}
  const appMeta = user.app_metadata && typeof user.app_metadata === 'object' && !Array.isArray(user.app_metadata)
    ? (user.app_metadata as Record<string, unknown>)
    : {}
  const isSuperuser =
    userMeta.is_superuser === true || appMeta.is_superuser === true

  if (isSuperuser) {
    return true
  }
  return role ? STAFF_ROLES.has(role) : false
}

export function isOperationalStaffUser(user: User): boolean {
  return isTenantScopedSurfaceUser(user, OPERATIONAL_STAFF_ROLES)
}

export function isAdminSurfaceUser(user: User): boolean {
  return isTenantScopedSurfaceUser(user, ADMIN_SURFACE_ROLES)
}

export function isSupportSurfaceUser(user: User): boolean {
  return isTenantScopedSurfaceUser(user, SUPPORT_SURFACE_ROLES)
}

export function isTeacherSurfaceUser(user: User): boolean {
  return isTenantScopedSurfaceUser(user, TEACHER_SURFACE_ROLES)
}

function isTenantScopedSurfaceUser(user: User, allowedRoles: Set<string>): boolean {
  const role = tenantRoleFromUserMetadata(user)
  const tenantSlug = tenantSlugFromUserMetadata(user)

  if (tenantSlug && tenantSlug !== getTenantSlug()) {
    return false
  }

  const userMeta = user.user_metadata && typeof user.user_metadata === 'object' && !Array.isArray(user.user_metadata)
    ? (user.user_metadata as Record<string, unknown>)
    : {}
  const appMeta = user.app_metadata && typeof user.app_metadata === 'object' && !Array.isArray(user.app_metadata)
    ? (user.app_metadata as Record<string, unknown>)
    : {}
  const isSuperuser =
    userMeta.is_superuser === true || appMeta.is_superuser === true

  if (isSuperuser) {
    return true
  }
  return role ? allowedRoles.has(role) : false
}
