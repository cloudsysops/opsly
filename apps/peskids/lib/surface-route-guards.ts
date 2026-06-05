function normalizePath(pathname: string): string {
  if (!pathname || pathname === '') {
    return '/'
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '')
  }
  return pathname
}

function pathEqualsOrNested(pathname: string, candidate: string): boolean {
  const path = normalizePath(pathname)
  const base = normalizePath(candidate)
  return path === base || path.startsWith(`${base}/`)
}

const FAMILY_PUBLIC_PATHS = [
  '/familias',
  '/familias/login',
  '/familias/verify',
] as const

const FAMILY_PROTECTED_PREFIXES = [
  '/familias/submissions',
  '/familias/clases',
  '/familias/reservas',
] as const

const TEACHER_PUBLIC_PATHS = ['/teacher/login', '/teacher/update-password'] as const
const SUPPORT_PUBLIC_PATHS = ['/support/login', '/support/update-password'] as const

export function isPublicFamiliasPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return FAMILY_PUBLIC_PATHS.some((candidate) => path === normalizePath(candidate))
}

export function isProtectedFamiliasPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  if (isPublicFamiliasPath(path)) {
    return false
  }
  return FAMILY_PROTECTED_PREFIXES.some((prefix) => pathEqualsOrNested(path, prefix))
}

export function isPublicTeacherPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return TEACHER_PUBLIC_PATHS.some((candidate) => pathEqualsOrNested(path, candidate))
}

export function isProtectedTeacherPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return path.startsWith('/teacher') && !isPublicTeacherPath(path)
}

export function isPublicSupportPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return SUPPORT_PUBLIC_PATHS.some((candidate) => pathEqualsOrNested(path, candidate))
}

export function isProtectedSupportPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return path.startsWith('/support') && !isPublicSupportPath(path)
}

export function loginPathForProtectedPath(pathname: string): string {
  if (isProtectedFamiliasPath(pathname) || pathname.startsWith('/familias')) {
    return '/familias/login'
  }
  if (isProtectedTeacherPath(pathname) || pathname.startsWith('/teacher')) {
    return '/teacher/login'
  }
  if (isProtectedSupportPath(pathname) || pathname.startsWith('/support')) {
    return '/support/login'
  }
  return '/admin/login'
}
