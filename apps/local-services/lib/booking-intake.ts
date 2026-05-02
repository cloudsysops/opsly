const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_NOTES = 2000;
const MAX_PHONE = 40;

const SERVICE_TYPES = ['visit', 'maintenance', 'consultation', 'other'] as const;

export type BookingServiceType = (typeof SERVICE_TYPES)[number];

export type BookingIntakePayload = {
  full_name: string;
  email: string;
  phone: string | null;
  service_type: BookingServiceType;
  preferred_at: string;
  notes: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseBookingIntakeBody(
  raw: unknown
): { ok: true; data: BookingIntakePayload } | { ok: false; message: string } {
  if (!isRecord(raw)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON.' };
  }

  const fullName = trimString(raw.full_name);
  if (fullName.length < 2 || fullName.length > MAX_NAME) {
    return { ok: false, message: 'Indica un nombre válido (2–120 caracteres).' };
  }

  const email = trimString(raw.email).toLowerCase();
  if (email.length === 0 || !EMAIL_RE.test(email)) {
    return { ok: false, message: 'Indica un correo electrónico válido.' };
  }

  const phoneRaw = trimString(raw.phone);
  const phone = phoneRaw.length === 0 ? null : phoneRaw;
  if (phone !== null && phone.length > MAX_PHONE) {
    return { ok: false, message: 'El teléfono es demasiado largo.' };
  }

  const serviceType = trimString(raw.service_type) as BookingServiceType;
  if (!(SERVICE_TYPES as readonly string[]).includes(serviceType)) {
    return { ok: false, message: 'Tipo de servicio no válido.' };
  }

  const preferredAt = trimString(raw.preferred_at);
  if (preferredAt.length === 0) {
    return { ok: false, message: 'Indica fecha y hora preferida.' };
  }
  const parsed = Date.parse(preferredAt);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: 'Fecha u hora no válida.' };
  }

  const notes = trimString(raw.notes);
  if (notes.length > MAX_NOTES) {
    return { ok: false, message: 'Las notas superan el tamaño máximo permitido.' };
  }

  return {
    ok: true,
    data: {
      full_name: fullName,
      email,
      phone,
      service_type: serviceType,
      preferred_at: preferredAt,
      notes,
    },
  };
}
