export type AuthSurfaceConfig = {
  entryPaths: readonly string[]
  loginPaths: readonly string[]
  invitePath: string
  recoveryPath: string
  updatePasswordPaths: readonly string[]
  authPrefixes?: readonly string[]
}

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

export function isPathUnderAuthSurface(
  pathname: string,
  config: AuthSurfaceConfig
): boolean {
  const path = normalizePath(pathname)

  if (config.authPrefixes?.some((prefix) => pathEqualsOrNested(path, prefix))) {
    return true
  }

  if (config.entryPaths.some((entry) => pathEqualsOrNested(path, entry))) {
    return true
  }

  if (config.loginPaths.some((login) => pathEqualsOrNested(path, login))) {
    return true
  }

  if (pathEqualsOrNested(path, config.invitePath)) {
    return true
  }

  if (pathEqualsOrNested(path, config.recoveryPath)) {
    return true
  }

  if (config.updatePasswordPaths.some((updatePath) => pathEqualsOrNested(path, updatePath))) {
    return true
  }

  return false
}

export function isLoginSurfacePath(pathname: string, config: AuthSurfaceConfig): boolean {
  const path = normalizePath(pathname)
  return config.entryPaths.some((entry) => pathEqualsOrNested(path, entry))
}

export function isInviteSurfacePath(pathname: string, config: AuthSurfaceConfig): boolean {
  return pathEqualsOrNested(pathname, config.invitePath)
}

export function isRecoverySurfacePath(pathname: string, config: AuthSurfaceConfig): boolean {
  return pathEqualsOrNested(pathname, config.recoveryPath)
}

export function isUpdatePasswordSurfacePath(
  pathname: string,
  config: AuthSurfaceConfig
): boolean {
  return config.updatePasswordPaths.some((updatePath) =>
    pathEqualsOrNested(pathname, updatePath)
  )
}
