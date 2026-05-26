export type TenantSiteRule = {
  tenantSlug: string
  siteUrl: string
  loginPath: string
  staffLoginPath?: string
}

export type TenantSiteRoutingConfig = {
  portal: {
    siteUrl: string
    loginPath: string
  }
  tenantRules: readonly TenantSiteRule[]
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '')
}

export type TenantSiteTarget = {
  siteUrl: string
  loginUrl: string
  publicHomeUrl: string
  isStaffSurface: boolean
}

export function resolveTenantSiteTarget(
  tenantSlug: string,
  config: TenantSiteRoutingConfig
): TenantSiteTarget {
  const slug = normalize(tenantSlug)
  const rule = config.tenantRules.find((entry) => entry.tenantSlug === slug)
  const resolved = rule ?? {
    tenantSlug: slug,
    siteUrl: config.portal.siteUrl,
    loginPath: config.portal.loginPath,
  }

  const siteUrl = normalizeUrl(resolved.siteUrl)
  const isStaffSurface = Boolean(resolved.staffLoginPath)
  const loginPath = isStaffSurface ? resolved.staffLoginPath ?? resolved.loginPath : resolved.loginPath
  const publicHomeUrl = `${siteUrl.replace(/\/$/, '')}`
  const loginUrl = `${siteUrl}${loginPath.startsWith('/') ? loginPath : `/${loginPath}`}`

  return {
    siteUrl,
    loginUrl,
    publicHomeUrl,
    isStaffSurface,
  }
}

