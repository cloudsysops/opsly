import { describe, expect, it } from 'vitest'
import { isOperationalStaffUser, isStaffUser } from '../staff-user'

describe('staff user helpers', () => {
  it('treats support as operational staff', () => {
    expect(
      isOperationalStaffUser({
        user_metadata: {},
        app_metadata: { role: 'support', tenant_slug: 'peskids' },
      } as never)
    ).toBe(true)
  })

  it('does not treat teacher as operational staff', () => {
    expect(
      isOperationalStaffUser({
        user_metadata: {},
        app_metadata: { role: 'teacher', tenant_slug: 'peskids' },
      } as never)
    ).toBe(false)
  })

  it('still treats teacher as staff for login access', () => {
    expect(
      isStaffUser({
        user_metadata: {},
        app_metadata: { role: 'teacher', tenant_slug: 'peskids' },
      } as never)
    ).toBe(true)
  })

  it('SECURITY: ignores role set only in user_metadata (self-service, client-writable)', () => {
    // A user can set this themselves via supabase.auth.updateUser({ data: { role: 'owner' } }).
    // Authorization must never be granted based on it.
    expect(
      isStaffUser({
        user_metadata: { role: 'owner', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe(false)
  })

  it('SECURITY: ignores is_superuser set only in user_metadata', () => {
    expect(
      isStaffUser({
        user_metadata: { is_superuser: true },
        app_metadata: {},
      } as never)
    ).toBe(false)
  })

  it('grants access when is_superuser is set in app_metadata', () => {
    expect(
      isStaffUser({
        user_metadata: {},
        app_metadata: { is_superuser: true },
      } as never)
    ).toBe(true)
  })
})
