/**
 * Slug del tenant Equipa / Local Services para reservas públicas.
 * Override en build: NEXT_PUBLIC_LOCAL_SERVICES_TENANT_SLUG=local-services
 */
export function getLocalServicesTenantSlug(): string {
  const raw = process.env.NEXT_PUBLIC_LOCAL_SERVICES_TENANT_SLUG?.trim();
  return raw !== undefined && raw.length > 0 ? raw : 'local-services';
}
