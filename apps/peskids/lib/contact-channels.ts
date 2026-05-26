/**
 * Canales de contacto Peskids (web pública).
 * Número y mensaje por env en Doppler / runtime/peskids.env — sin hardcodear en componentes.
 */

import { PESKIDS_WHATSAPP_INTAKE_PREFILL } from '@/lib/peskids-intake-messages';

const DEFAULT_WHATSAPP_E164 = '573000000000';
const DEFAULT_WHATSAPP_DISPLAY = '+57 300 000 0000';

/** Solo dígitos E.164 sin + (ej. 573001234567). */
export function normalizeWhatsAppE164(raw: string | undefined): string {
  if (!raw?.trim()) return DEFAULT_WHATSAPP_E164;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return DEFAULT_WHATSAPP_E164;
  return digits;
}

export const PESKIDS_CONTACT = {
  email: process.env.NEXT_PUBLIC_PESKIDS_CONTACT_EMAIL?.trim() || 'hola@peskids.co',
  whatsapp: {
    e164: normalizeWhatsAppE164(process.env.NEXT_PUBLIC_PESKIDS_WHATSAPP_E164),
    display: process.env.NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY?.trim() || DEFAULT_WHATSAPP_DISPLAY,
    prefill:
      process.env.NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL?.trim() || PESKIDS_WHATSAPP_INTAKE_PREFILL,
  },
} as const;

export function buildWhatsAppUrl(options?: { prefill?: string }): string {
  const phone = PESKIDS_CONTACT.whatsapp.e164;
  const text = encodeURIComponent(options?.prefill ?? PESKIDS_CONTACT.whatsapp.prefill);
  return `https://wa.me/${phone}?text=${text}`;
}
