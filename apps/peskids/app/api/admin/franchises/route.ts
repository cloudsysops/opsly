import { z } from 'zod';
import {
  listFranchises,
  updateFranchiseStatus,
} from '@/lib/services/franchise-management.service';
import { validateAdminJWT } from '@/lib/middleware/admin-auth';

const listQuerySchema = z.object({
  status: z.string().optional(),
  tier: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const updateStatusSchema = z.object({
  franchiseTenantId: z.string().uuid(),
  status: z.enum(['approved', 'active', 'suspended', 'rejected']),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/franchises
 * List all franchises with optional filters
 * Query params: status, tier, offset, limit
 */
export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const auth = await validateAdminJWT(req);
    if (!auth.isAdmin) {
      return Response.json(
        { error: 'Unauthorized - admin access required', request_id: requestId },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const params = listQuerySchema.parse({
      status: url.searchParams.get('status'),
      tier: url.searchParams.get('tier'),
      offset: url.searchParams.get('offset'),
      limit: url.searchParams.get('limit'),
    });

    const result = await listFranchises(params);

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error,
          request_id: requestId,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        data: {
          franchises: result.franchises,
          total: result.total,
          offset: params.offset,
          limit: params.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/admin/franchises]', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid query parameters',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to list franchises',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/franchises
 * Update franchise status (approve, activate, suspend)
 */
export async function PATCH(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const auth = await validateAdminJWT(req);
    if (!auth.isAdmin) {
      return Response.json(
        { error: 'Unauthorized - admin access required', request_id: requestId },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { franchiseTenantId, status, notes } = updateStatusSchema.parse(body);

    const result = await updateFranchiseStatus({
      franchiseTenantId,
      status,
      notes,
    });

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: true,
        data: { status },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PATCH /api/admin/franchises]', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid request',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to update franchise',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
