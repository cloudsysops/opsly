import { HTTP_STATUS } from './constants';
import { fetchPortalTenantRowBySlug } from './portal-me';

/**
 * Validates tenant slug exists and is active (public booking flow).
 */
export async function assertLocalServicesTenantPublic(slug: string): Promise<Response | null> {
  const lookup = await fetchPortalTenantRowBySlug(slug);
  if (!lookup.ok) {
    const status = lookup.reason === 'db' ? HTTP_STATUS.INTERNAL_ERROR : HTTP_STATUS.NOT_FOUND;
    const msg = lookup.reason === 'db' ? 'Internal server error' : 'Tenant not found';
    return Response.json({ error: msg }, { status });
  }
  if (lookup.row.status !== 'active') {
    return Response.json(
      { error: 'Tenant not available for booking' },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }
  return null;
}
