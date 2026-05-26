import type { PeskidsChatMode } from '@/lib/peskids-intake-messages'

const STAFF_SURFACE_PREFIXES = ['/admin', '/teacher', '/support', '/invite', '/auth']

export function isStaffSurfacePath(pathname?: string | null): boolean {
  if (!pathname) return false
  return STAFF_SURFACE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function shouldShowPeskidsChatWidgets(pathname?: string | null): boolean {
  return !isStaffSurfacePath(pathname)
}

export function getPeskidsChatMode(pathname?: string | null): PeskidsChatMode | null {
  if (isStaffSurfacePath(pathname)) {
    return null
  }
  return pathname?.startsWith('/familias') ? 'support' : 'admissions'
}
