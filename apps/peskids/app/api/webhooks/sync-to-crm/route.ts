import { z } from 'zod'
import { syncContactToCRM } from '@/lib/services/crm-sync.service'

const syncPayloadSchema = z.object({
  franchiseTenantId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  status: z.enum(['lead', 'enrolled', 'active', 'inactive']).default('lead'),
  source: z.enum(['form', 'referral', 'web', 'api']).default('form'),
  notes: z.string().optional(),
})

/**
 * POST /api/webhooks/sync-to-crm
 * Sync contact to Twenty CRM when created in Peskids
 * Called by:
 * - Form submission handler
 * - Lead creation
 * - Manual admin sync
 */
export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()

  try {
    const body = await req.json()
    const payload = syncPayloadSchema.parse(body)

    // Sync to Twenty CRM with franchise isolation
    const result = await syncContactToCRM({
      franchiseTenantId: payload.franchiseTenantId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      status: payload.status,
      source: payload.source,
      notes: payload.notes,
    })

    if (!result.success) {
      console.warn(`[SYNC-TO-CRM] Failed for ${payload.email}: ${result.error}`)
      // Don't fail the form submission if CRM sync fails
      // Just log it for debugging
      return Response.json(
        {
          ok: false,
          warning: 'Contact created but CRM sync failed',
          error: result.error,
          request_id: requestId,
        },
        { status: 202 } // 202 Accepted (partially successful)
      )
    }

    return Response.json(
      {
        ok: true,
        data: {
          contactId: result.contactId,
          franchiseTenantId: payload.franchiseTenantId,
          email: payload.email,
        },
        request_id: requestId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/webhooks/sync-to-crm]', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid payload',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      )
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to sync contact to CRM',
        request_id: requestId,
      },
      { status: 500 }
    )
  }
}
