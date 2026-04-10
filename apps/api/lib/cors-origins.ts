/**
 * Orígenes permitidos para CORS (admin, portal y web en subdominios distintos).
 * Sin wildcard; se compara con el header Origin de la petición.
 */
function addExplicitOrigins(out: Set<string>): void {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (adminUrl) out.add(adminUrl.replace(/\/$/, ""));
  if (portalUrl) out.add(portalUrl.replace(/\/$/, ""));
  if (webUrl) out.add(webUrl.replace(/\/$/, ""));
}

function addDomainOrigins(out: Set<string>): void {
  const domain =
    process.env.PLATFORM_DOMAIN?.trim() ??
    process.env.PLATFORM_BASE_DOMAIN?.trim();
  if (!domain) return;
  out.add(`https://admin.${domain}`);
  out.add(`https://portal.${domain}`);
  out.add(`https://web.${domain}`);
}

export function getAllowedCorsOrigins(): string[] {
  const out = new Set<string>();
  addExplicitOrigins(out);
  addDomainOrigins(out);
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
