import { describe, expect, it } from 'vitest'
import { isOperationalStaffUser, isStaffUser } from '../staff-user'

describe('staff user helpers', () => {
  it('treats support as operational staff', () => {
    expect(
      isOperationalStaffUser({
        user_metadata: { role: 'support', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe(true)
  })

  it('does not treat teacher as operational staff', () => {
    expect(
      isOperationalStaffUser({
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe(false)
  })

  it('still treats teacher as staff for login access', () => {
    expect(
      isStaffUser({
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe(true)
  })
})
