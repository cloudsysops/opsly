import { describe, expect, it } from 'vitest'
import {
  isAdminSurfaceUser,
  isSupportSurfaceUser,
  isTeacherSurfaceUser,
} from '../staff-user'

describe('staff surface helpers', () => {
  const admin = {
    user_metadata: {},
    app_metadata: { role: 'admin', tenant_slug: 'peskids' },
  } as never
  const support = {
    user_metadata: {},
    app_metadata: { role: 'support', tenant_slug: 'peskids' },
  } as never
  const teacher = {
    user_metadata: {},
    app_metadata: { role: 'teacher', tenant_slug: 'peskids' },
  } as never

  it('limits admin surface to owner/admin', () => {
    expect(isAdminSurfaceUser(admin)).toBe(true)
    expect(isAdminSurfaceUser(support)).toBe(false)
    expect(isAdminSurfaceUser(teacher)).toBe(false)
  })

  it('allows support surface for owner/admin/support only', () => {
    expect(isSupportSurfaceUser(admin)).toBe(true)
    expect(isSupportSurfaceUser(support)).toBe(true)
    expect(isSupportSurfaceUser(teacher)).toBe(false)
  })

  it('allows teacher surface for owner/admin/teacher only', () => {
    expect(isTeacherSurfaceUser(admin)).toBe(true)
    expect(isTeacherSurfaceUser(support)).toBe(false)
    expect(isTeacherSurfaceUser(teacher)).toBe(true)
  })
})
