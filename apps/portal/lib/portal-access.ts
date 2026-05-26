import type { User } from '@supabase/supabase-js'
import { isSuperAdminUser } from '@/lib/super-admin'
import {
  tenantRoleFromUserMetadata,
  tenantSlugFromUserMetadata,
} from '../../../lib/runtime/src/tenant-identity'

const PESKIDS_STAFF_ROLES = new Set(['admin', 'support', 'teacher'])

/** Portal cliente: tenants con invitación; no staff Peskids ni super-admin de plataforma. */
export function isPortalTenantUser(user: User): boolean {
  if (isSuperAdminUser(user)) {
    return false
  }

  const role = tenantRoleFromUserMetadata(user)
  const tenantSlug = tenantSlugFromUserMetadata(user)

  if (!tenantSlug) {
    return false
  }

  if (tenantSlug === 'peskids' && (role ? PESKIDS_STAFF_ROLES.has(role) || role === 'owner' : false)) {
    return false
  }

  return true
}
