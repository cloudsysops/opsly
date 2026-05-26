import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requestFamilyAccessInvite } from '@/lib/family-access'
import { getClientIdentifier, rateLimit } from '../../../../lib/rate-limit'

const familyAccessSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientId = getClientIdentifier(request.headers)
    if (!rateLimit(`family-access:${clientId}`, 3, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = familyAccessSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const result = await requestFamilyAccessInvite({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
    })

    return NextResponse.json(
      {
        ok: true,
        message: 'Si el correo está asociado a una reserva o estudiante activo, te enviamos un enlace seguro.',
        emailDeliverySkipped: result.emailDeliverySkipped ?? false,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Family access endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
