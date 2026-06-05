import { describe, expect, it } from 'vitest'
import { resolveLoginPath, resolvePostAuthPath } from '../../../lib/auth-callback'

describe('resolveLoginPath', () => {
  it('routes families errors to the family login', () => {
    expect(resolveLoginPath('/familias/submissions')).toBe('/familias/login')
  })

  it('routes teachers errors to the teacher login', () => {
    expect(resolveLoginPath('/teacher/dashboard')).toBe('/teacher/login')
  })

  it('routes support errors to the support login', () => {
    expect(resolveLoginPath('/support/dashboard')).toBe('/support/login')
  })

  it('defaults to admin login', () => {
    expect(resolveLoginPath('/admin')).toBe('/admin/login')
  })
})

describe('resolvePostAuthPath', () => {
  it('routes family users to their submissions page when next is missing', () => {
    expect(
      resolvePostAuthPath(null, {
        user_metadata: { role: 'family', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe('/familias/submissions')

    expect(
      resolvePostAuthPath(null, {
        user_metadata: { role: 'parent', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe('/familias/submissions')
  })

  it('routes staff users by role when next is missing', () => {
    expect(
      resolvePostAuthPath(null, {
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe('/teacher/dashboard')

    expect(
      resolvePostAuthPath(null, {
        user_metadata: { role: 'support', tenant_slug: 'peskids' },
        app_metadata: {},
      } as never)
    ).toBe('/support/dashboard')
  })
})
