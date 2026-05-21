import { HTTP_STATUS } from '../constants';
import { fetchPortalTenantRowBySlug } from '../portal-me';
import { PESKIDS_TENANT_SLUG } from './constants';

/**
 * Public capture routes: tenant must exist and be active.
 */
export async function assertPeskidsTenantPublic(slug: string): Promise<Response | null> {
  if (slug !== PESKIDS_TENANT_SLUG) {
    return Response.json({ error: 'Tenant not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const lookup = await fetchPortalTenantRowBySlug(slug);
  if (!lookup.ok) {
    const status = lookup.reason === 'db' ? HTTP_STATUS.INTERNAL_ERROR : HTTP_STATUS.NOT_FOUND;
    const msg = lookup.reason === 'db' ? 'Internal server error' : 'Tenant not found';
    return Response.json({ error: msg }, { status });
  }
  if (lookup.row.status !== 'active') {
    return Response.json({ error: 'Tenant not available' }, { status: HTTP_STATUS.FORBIDDEN });
  }
  return null;
}
