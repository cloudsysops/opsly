import { describe, expect, it } from 'vitest'
import { resolveTenantSiteTarget } from '../src/tenant-site-routing'

const config = {
  portal: {
    siteUrl: 'https://portal.op-sly.com',
    loginPath: '/login',
  },
  tenantRules: [
    {
      tenantSlug: 'peskids',
      siteUrl: 'https://peskids.op-sly.com',
      loginPath: '/login',
      staffLoginPath: '/admin/login',
    },
  ],
} as const

describe('resolveTenantSiteTarget', () => {
  it('returns the staff login path for peskids', () => {
    const target = resolveTenantSiteTarget('peskids', config)

    expect(target.siteUrl).toBe('https://peskids.op-sly.com')
    expect(target.loginUrl).toBe('https://peskids.op-sly.com/admin/login')
    expect(target.publicHomeUrl).toBe('https://peskids.op-sly.com')
    expect(target.isStaffSurface).toBe(true)
  })

  it('falls back to portal login for unknown tenants', () => {
    const target = resolveTenantSiteTarget('acme', config)

    expect(target.siteUrl).toBe('https://portal.op-sly.com')
    expect(target.loginUrl).toBe('https://portal.op-sly.com/login')
    expect(target.isStaffSurface).toBe(false)
  })
})
