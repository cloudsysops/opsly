import { z } from 'zod'
import { searchCRMContacts } from '@/lib/services/crm-sync.service'

const searchQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['lead', 'enrolled', 'active', 'inactive']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * GET /api/crm/search?q=john&status=lead&limit=50
 * Search CRM contacts filtered by franchise (from session)
 */
export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()

  try {
    // TODO: Validate franchise session
    const franchiseTenantId = req.headers.get('x-franchise-id') || 'demo'

    const url = new URL(req.url)
    const params = searchQuerySchema.parse({
      q: url.searchParams.get('q'),
      status: url.searchParams.get('status'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    })

    const result = await searchCRMContacts(franchiseTenantId, params.q || '', {
      status: params.status,
      limit: params.limit,
      offset: params.offset,
    })

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error,
          request_id: requestId,
        },
        { status: 400 }
      )
    }

    return Response.json(
      {
        ok: true,
        data: {
          contacts: result.contacts || [],
          total: result.total || 0,
          offset: params.offset,
          limit: params.limit,
          query: params.q,
          franchise_id: franchiseTenantId,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/crm/search]', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid query parameters',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      )
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to search contacts',
        request_id: requestId,
      },
      { status: 500 }
    )
  }
}
