import { z } from 'zod'
import { getFranchiseDetails } from '@/lib/services/franchise-management.service'

/**
 * GET /api/admin/franchises/:franchiseId
 * Get franchise details
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ franchiseId: string }> }
) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()

  try {
    // TODO: Validate admin auth
    const { franchiseId } = await params

    if (!franchiseId || !z.string().uuid().safeParse(franchiseId).success) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid franchise ID',
          request_id: requestId,
        },
        { status: 400 }
      )
    }

    const result = await getFranchiseDetails(franchiseId)

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error,
          request_id: requestId,
        },
        { status: 404 }
      )
    }

    return Response.json(
      {
        ok: true,
        data: result.franchise,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/admin/franchises/:franchiseId]', error)

    return Response.json(
      {
        ok: false,
        error: 'Failed to get franchise details',
        request_id: requestId,
      },
      { status: 500 }
    )
  }
}
