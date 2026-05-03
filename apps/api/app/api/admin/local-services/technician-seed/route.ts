import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import type { Json } from '../../../../../lib/supabase/types';
import { getServiceClient } from '../../../../../lib/supabase';
import { seedTechnicianLocalServicesForSlug } from '../../../../../lib/technician-local-services-seed';
import { isTechnicianTenantMetadata } from '../../../../../lib/technician-tenant-profile';
import { formatZodError } from '../../../../../lib/validation';
import { z } from 'zod';

const bodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
});

/**
 * POST /api/admin/local-services/technician-seed
 * Inserts ls_services + ls_technician_schedules for a tenant that already has technician metadata.
 */
export function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/admin/local-services/technician-seed', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) {
      return authError;
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const parsed = bodySchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const { data: row, error } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('metadata')
      .eq('slug', parsed.data.slug)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      return serverErrorLogged('technician-seed fetch tenant', error);
    }
    if (row === null) {
      return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
    }

    const metadata = (row as { metadata: Json | null }).metadata;
    if (metadata === null) {
      return jsonError('Tenant metadata missing', HTTP_STATUS.BAD_REQUEST);
    }
    if (!isTechnicianTenantMetadata(metadata)) {
      return jsonError('Tenant metadata is not technician profile', HTTP_STATUS.BAD_REQUEST);
    }

    const seeded = await seedTechnicianLocalServicesForSlug({
      tenantSlug: parsed.data.slug,
      metadata,
    });
    if (!seeded.ok) {
      return jsonError(seeded.error, HTTP_STATUS.BAD_REQUEST);
    }

    return Response.json({ ok: true, slug: parsed.data.slug });
  });
}
