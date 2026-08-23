export type TenantMetadata = {
  user_metadata?: unknown
  app_metadata?: unknown
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function metadataRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {}
  }
  return meta as Record<string, unknown>
}

// SECURITY: role and tenant_slug MUST be read from app_metadata only.
// user_metadata is self-service data — any authenticated user can rewrite it via
// supabase.auth.updateUser({ data: {...} }), so it can never be an authorization signal.
// app_metadata is writable only via the Supabase Admin API (service role).
export function tenantSlugFromUserMetadata(user: TenantMetadata | null | undefined): string | undefined {
  if (!user) {
    return undefined
  }

  const appMeta = metadataRecord(user.app_metadata)
  const tenantSlug = normalize(appMeta.tenant_slug)
  return tenantSlug.length > 0 ? tenantSlug : undefined
}

export function tenantRoleFromUserMetadata(user: TenantMetadata | null | undefined): string | undefined {
  if (!user) {
    return undefined
  }

  const appMeta = metadataRecord(user.app_metadata)
  const role = normalize(appMeta.role)
  return role.length > 0 ? role : undefined
}

export function tenantIdentityFromUser(user: TenantMetadata | null | undefined): {
  tenantSlug?: string
  role?: string
} {
  return {
    tenantSlug: tenantSlugFromUserMetadata(user),
    role: tenantRoleFromUserMetadata(user),
  }
}

export function isTenantSlugMatch(
  user: TenantMetadata | null | undefined,
  expectedTenantSlug: string
): boolean {
  const tenantSlug = tenantSlugFromUserMetadata(user)
  if (!tenantSlug) {
    return false
  }
  return tenantSlug === normalize(expectedTenantSlug)
}
