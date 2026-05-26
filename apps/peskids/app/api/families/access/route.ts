import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requestFamilyAccessInvite } from '@/lib/family-access'
import { getClientIdentifier, rateLimit } from '../../../../lib/rate-limit'
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response'

const familyAccessSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(request)
  try {
    const clientId = getClientIdentifier(request.headers)
    if (!rateLimit(`family-access:${clientId}`, 3, 10 * 60 * 1000)) {
      return errorJson(requestId, 'Too many requests', 429)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorJson(requestId, 'Invalid JSON body', 400)
    }

    const parsed = familyAccessSchema.safeParse(body)
    if (!parsed.success) {
      return errorJson(requestId, 'Email requerido', 400)
    }

    const result = await requestFamilyAccessInvite({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
    })

    return successJson(
      requestId,
      {
        ok: true,
        message: 'Si el correo está asociado a una reserva o estudiante activo, te enviamos un enlace seguro.',
        emailDeliverySkipped: result.emailDeliverySkipped ?? false,
      },
      202
    )
  } catch (error) {
    console.error('Family access endpoint error:', error, { request_id: requestId })
    return errorJson(requestId, 'Internal server error', 500)
  }
}
