import { z } from 'zod'
import { getAllContactsForAdmin } from '@/lib/services/crm-sync.service'

const adminSearchSchema = z.object({
  q: z.string().optional(),
  franchise_id: z.string().optional(),
  status: z.enum(['lead', 'enrolled', 'active', 'inactive']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * GET /api/admin/crm/contacts?q=search&franchise_id=xxx&status=lead
 * Admin-only: Search all CRM contacts across franchises
 * Can filter by franchise_id for specific franchise view
 * Can filter by status (lead, enrolled, active, inactive)
 */
export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()

  try {
    // TODO: Validate admin auth
    const url = new URL(req.url)
    const params = adminSearchSchema.parse({
      q: url.searchParams.get('q'),
      franchise_id: url.searchParams.get('franchise_id'),
      status: url.searchParams.get('status'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    })

    const result = await getAllContactsForAdmin({
      franchiseTenantId: params.franchise_id,
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

    // Group by franchise for dashboard view
    const contactsByFranchise = result.contacts?.reduce(
      (acc: Record<string, number>, contact: any) => {
        const franchiseId = contact.franchiseTenantId
        acc[franchiseId] = (acc[franchiseId] || 0) + 1
        return acc
      },
      {}
    ) || {}

    return Response.json(
      {
        ok: true,
        data: {
          contacts: result.contacts || [],
          total: result.total || 0,
          offset: params.offset,
          limit: params.limit,
          filters: {
            query: params.q,
            franchise_id: params.franchise_id,
            status: params.status,
          },
          stats: {
            totalByFranchise: contactsByFranchise,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/admin/crm/contacts]', error)

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
