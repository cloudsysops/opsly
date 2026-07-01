import { NextRequest } from 'next/server'
import { z } from 'zod'
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response'
import { requestPeskidsStaffRecovery } from '@/lib/team-management'

const recoverySchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400)
  }

  const parsed = recoverySchema.safeParse(body)
  if (!parsed.success) {
    return errorJson(requestId, 'Email requerido', 400)
  }

  try {
    await requestPeskidsStaffRecovery(parsed.data.email)
  } catch (err) {
    console.error('[staff-recovery] request failed', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return successJson(
    requestId,
    {
      ok: true,
      message:
        'Si el correo pertenece a una cuenta de staff Peskids, enviaremos un enlace seguro para definir una contraseña nueva.',
    },
    202
  )
}
