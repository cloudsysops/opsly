/**
 * Orígenes permitidos para CORS (admin y portal en subdominios distintos).
 * Sin wildcard; se compara con el header Origin de la petición.
 */
export function getAllowedCorsOrigins(): string[] {
  const out = new Set<string>();
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  const domain =
    process.env.PLATFORM_DOMAIN?.trim() ?? process.env.PLATFORM_BASE_DOMAIN?.trim();

  if (adminUrl) {
    out.add(adminUrl.replace(/\/$/, ""));
  }
  if (portalUrl) {
    out.add(portalUrl.replace(/\/$/, ""));
  }
  if (domain) {
    out.add(`https://admin.${domain}`);
    out.add(`https://portal.${domain}`);
  }
  return [...out];
}

export function pickCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin || requestOrigin.length === 0) {
    return null;
  }
  const normalized = requestOrigin.replace(/\/$/, "");
  const allowed = getAllowedCorsOrigins();
  return allowed.includes(normalized) ? requestOrigin : null;
}
