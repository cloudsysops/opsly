import { describe, expect, it } from 'vitest'
import {
  isProtectedFamiliasPath,
  isProtectedSupportPath,
  isProtectedTeacherPath,
  isPublicFamiliasPath,
  loginPathForProtectedPath,
} from '../surface-route-guards'

describe('surface-route-guards', () => {
  it('treats family marketing and login as public', () => {
    expect(isPublicFamiliasPath('/familias')).toBe(true)
    expect(isPublicFamiliasPath('/familias/login')).toBe(true)
    expect(isPublicFamiliasPath('/familias/verify')).toBe(true)
    expect(isProtectedFamiliasPath('/familias/login')).toBe(false)
  })

  it('protects family operational routes', () => {
    expect(isProtectedFamiliasPath('/familias/submissions')).toBe(true)
    expect(isProtectedFamiliasPath('/familias/clases')).toBe(true)
    expect(isProtectedFamiliasPath('/familias/reservas')).toBe(true)
  })

  it('protects teacher and support dashboards but not login', () => {
    expect(isProtectedTeacherPath('/teacher/dashboard')).toBe(true)
    expect(isProtectedTeacherPath('/teacher/login')).toBe(false)
    expect(isProtectedSupportPath('/support/dashboard')).toBe(true)
    expect(isProtectedSupportPath('/support/login')).toBe(false)
  })

  it('maps protected paths to the correct login surface', () => {
    expect(loginPathForProtectedPath('/familias/submissions')).toBe('/familias/login')
    expect(loginPathForProtectedPath('/teacher/dashboard')).toBe('/teacher/login')
    expect(loginPathForProtectedPath('/support/dashboard')).toBe('/support/login')
    expect(loginPathForProtectedPath('/admin')).toBe('/admin/login')
  })
})
