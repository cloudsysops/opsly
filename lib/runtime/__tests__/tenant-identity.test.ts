import { describe, expect, it } from 'vitest'
import {
  isTenantSlugMatch,
  tenantIdentityFromUser,
  tenantRoleFromUserMetadata,
  tenantSlugFromUserMetadata,
} from '../src/tenant-identity'

describe('tenant-identity', () => {
  it('extracts slug and role from user and app metadata', () => {
    const identity = tenantIdentityFromUser({
      user_metadata: { tenant_slug: ' peskids ', role: ' Teacher ' },
      app_metadata: { tenant_slug: 'portal', role: 'owner' },
    })

    expect(identity.tenantSlug).toBe('peskids')
    expect(identity.role).toBe('teacher')
  })

  it('matches tenant slug case-insensitively when comparing metadata', () => {
    expect(
      isTenantSlugMatch(
        {
          user_metadata: { tenant_slug: 'PESKIDS' },
        },
        'peskids'
      )
    ).toBe(true)
  })

  it('returns undefined for empty metadata', () => {
    expect(tenantSlugFromUserMetadata(null)).toBeUndefined()
    expect(tenantRoleFromUserMetadata(undefined)).toBeUndefined()
  })
})
