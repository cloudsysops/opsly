export const DEFAULT_HEALTH_TRAVEL_TENANT_SLUG = 'medical-tourism-demo';

export function resolveHealthTravelTenantSlug(
  explicit?: string | null,
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    explicit?.trim() || env.HEALTH_TRAVEL_TENANT_SLUG?.trim() || DEFAULT_HEALTH_TRAVEL_TENANT_SLUG
  );
}
