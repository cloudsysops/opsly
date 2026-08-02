import { z } from 'zod';

import { jsonError, jsonOk, parseJsonBody, serverErrorLogged, tryRoute } from '../../../../lib/api-response';
import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import {
  editableCatalogSchema,
  formatZodCatalogError,
  readCatalog,
  saveCatalog,
} from '../../../../lib/services/icso-catalog.service';

const putBodySchema = z.object({
  catalog: editableCatalogSchema,
  etag: z.string().min(1),
});

export async function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/icso/catalog', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) {
      return authError;
    }

    try {
      const { catalog, etag } = readCatalog();
      return jsonOk({ catalog, etag });
    } catch (err) {
      return serverErrorLogged('GET /api/icso/catalog:', err);
    }
  });
}

export async function PUT(request: Request): Promise<Response> {
  return tryRoute('PUT /api/icso/catalog', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) {
      return authError;
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const bodyResult = putBodySchema.safeParse(parsedBody.body);
    if (!bodyResult.success) {
      return jsonError(formatZodCatalogError(bodyResult.error), HTTP_STATUS.BAD_REQUEST);
    }

    const result = saveCatalog(bodyResult.data.catalog, bodyResult.data.etag);
    if (!result.ok) {
      if (result.reason === 'stale') {
        return Response.json(
          {
            error: 'Catalog changed since you loaded it; reload and retry.',
            reason: 'stale',
          },
          { status: HTTP_STATUS.CONFLICT }
        );
      }
      if (result.reason === 'referenced') {
        return Response.json(
          {
            error: 'Cannot save: referential integrity violation.',
            reason: 'referenced',
            details: result.details,
          },
          { status: HTTP_STATUS.CONFLICT }
        );
      }
      return jsonError(result.message, HTTP_STATUS.BAD_REQUEST);
    }

    return jsonOk({ ok: true, etag: result.etag });
  });
}
