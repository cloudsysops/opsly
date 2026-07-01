import { describe, expect, it } from 'vitest'
import { getPeskidsChatMode, isStaffSurfacePath, shouldShowPeskidsChatWidgets } from '../peskids-surface'

describe('peskids surface helpers', () => {
  it('hides chat widgets on staff and auth surfaces', () => {
    expect(isStaffSurfacePath('/admin')).toBe(true)
    expect(isStaffSurfacePath('/teacher/login')).toBe(true)
    expect(isStaffSurfacePath('/support/dashboard')).toBe(true)
    expect(isStaffSurfacePath('/invite/abc')).toBe(true)
    expect(isStaffSurfacePath('/auth/recovery')).toBe(true)
    expect(shouldShowPeskidsChatWidgets('/admin/login')).toBe(false)
    expect(shouldShowPeskidsChatWidgets('/teacher')).toBe(false)
    expect(shouldShowPeskidsChatWidgets('/support/login')).toBe(false)
  })

  it('keeps public and family surfaces visible', () => {
    expect(isStaffSurfacePath('/')).toBe(false)
    expect(isStaffSurfacePath('/familias')).toBe(false)
    expect(isStaffSurfacePath('/privacy')).toBe(false)
    expect(shouldShowPeskidsChatWidgets('/')).toBe(true)
    expect(shouldShowPeskidsChatWidgets('/familias/login')).toBe(true)
  })

  it('routes the families portal to support chat mode', () => {
    expect(getPeskidsChatMode('/')).toBe('admissions')
    expect(getPeskidsChatMode('/familias')).toBe('support')
    expect(getPeskidsChatMode('/familias/submissions')).toBe('support')
    expect(getPeskidsChatMode('/admin/login')).toBeNull()
  })
})
