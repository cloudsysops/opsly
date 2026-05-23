import { describe, expect, it } from 'vitest'
import { recoveryTargetFromMetadata } from '../auth-recovery'

describe('recoveryTargetFromMetadata', () => {
  it('routes peskids staff to peskids origin', () => {
    const target = recoveryTargetFromMetadata({ tenant_slug: 'peskids', role: 'admin' })
    expect(target.app).toBe('peskids_staff')
    expect(target.origin).toContain('peskids')
    expect(target.updatePasswordPath).toBe('/admin/update-password')
  })

  it('routes smiletripcare tenant to portal', () => {
    const target = recoveryTargetFromMetadata({ tenant_slug: 'smiletripcare', role: 'owner' })
    expect(target.app).toBe('portal')
    expect(target.origin).toContain('portal')
  })

  it('routes platform superuser to admin', () => {
    const target = recoveryTargetFromMetadata({
      tenant_slug: 'intcloudsysops',
      role: 'admin',
      is_superuser: true,
    })
    expect(target.app).toBe('platform_admin')
    expect(target.origin).toContain('admin')
  })
})
