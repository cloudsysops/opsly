import { NextResponse } from 'next/server';

import { parseBookingIntakeBody } from '@/lib/booking-intake';

export const runtime = 'nodejs';

const HTTP_BAD_REQUEST = 400;
const HTTP_ACCEPTED = 202;

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: HTTP_BAD_REQUEST });
  }

  const parsed = parseBookingIntakeBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: HTTP_BAD_REQUEST });
  }

  return NextResponse.json(
    {
      status: 'accepted',
      message:
        'Solicitud recibida. En producción se puede enlazar con la API Opsly o almacenamiento persistente.',
      received: {
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        service_type: parsed.data.service_type,
        preferred_at: parsed.data.preferred_at,
        notes: parsed.data.notes.length > 0 ? parsed.data.notes : undefined,
      },
    },
    { status: HTTP_ACCEPTED }
  );
}
