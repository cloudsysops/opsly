import { describe, expect, it } from 'vitest'
import {
  buildRecoveryRedirectTo,
  resolveRecoveryTargetFromMetadata,
  type RecoveryRoutingConfig,
} from '../src/tenant-auth-routing'

const config: RecoveryRoutingConfig = {
  portal: {
    origin: 'https://portal.op-sly.com',
    updatePasswordPath: '/update-password',
  },
  platformAdmin: {
    origin: 'https://admin.op-sly.com',
    updatePasswordPath: '/update-password',
    tenantSlugs: ['intcloudsysops'],
  },
  tenantRules: [
    {
      tenantSlug: 'peskids',
      app: 'peskids_staff',
      origin: 'https://peskids.op-sly.com',
      staffRoles: ['owner', 'admin', 'support', 'teacher'],
      updatePasswordPath: '/admin/update-password',
    },
  ],
}

describe('resolveRecoveryTargetFromMetadata', () => {
  it('builds recovery redirects through the auth callback', () => {
    expect(buildRecoveryRedirectTo('https://peskids.op-sly.com')).toBe(
      'https://peskids.op-sly.com/auth/callback?next=%2Fauth%2Frecovery'
    )
  })

  it('routes tenant staff by tenant_slug and role', () => {
    const target = resolveRecoveryTargetFromMetadata(
      { tenant_slug: 'peskids', role: 'teacher' },
      config
    )

    expect(target.app).toBe('peskids_staff')
    expect(target.origin).toBe('https://peskids.op-sly.com')
    expect(target.updatePasswordPath).toBe('/admin/update-password')
  })

  it('routes unknown tenants to portal fallback', () => {
    const target = resolveRecoveryTargetFromMetadata(
      { tenant_slug: 'new-client', role: 'owner' },
      config
    )

    expect(target.app).toBe('portal')
    expect(target.origin).toBe('https://portal.op-sly.com')
    expect(target.updatePasswordPath).toBe('/update-password')
  })

  it('routes superuser admin metadata to platform admin', () => {
    const target = resolveRecoveryTargetFromMetadata(
      { tenant_slug: 'intcloudsysops', role: 'admin', is_superuser: true },
      config
    )

    expect(target.app).toBe('platform_admin')
    expect(target.origin).toBe('https://admin.op-sly.com')
    expect(target.updatePasswordPath).toBe('/update-password')
  })
})
