/**
 * Canales de contacto Peskids (web pública).
 * Números E.164 Colombia (+57). Preferir Doppler / env; defaults = líneas públicas sede/domicilio.
 */

import { PESKIDS_WHATSAPP_INTAKE_PREFILL } from '@/lib/peskids-intake-messages';

/** Colombia (+57) — Llanogrande sede (también canal general). */
const DEFAULT_WHATSAPP_E164 = '573054702600';
const DEFAULT_WHATSAPP_DISPLAY = '+57 305 470 2600';
const DEFAULT_LLANOGRANDE_E164 = '573054702600';
const DEFAULT_LLANOGRANDE_DISPLAY = '+57 305 470 2600';
/** Colombia (+57) — Domicilios. */
const DEFAULT_DOMICILIO_E164 = '573054790273';
const DEFAULT_DOMICILIO_DISPLAY = '+57 305 479 0273';

export type PeskidsWhatsAppChannel = 'default' | 'llanogrande' | 'domicilio';

/**
 * Solo dígitos E.164 sin +.
 * Acepta `+57…`, `57…` o móvil CO de 10 dígitos (`305…`) y antepone 57.
 */
export function normalizeWhatsAppE164(raw: string | undefined): string {
  if (!raw?.trim()) return DEFAULT_WHATSAPP_E164;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `57${digits}`;
  }
  if (digits.length < 11) return DEFAULT_WHATSAPP_E164;
  return digits;
}

function envWhatsApp(
  e164Key: string,
  displayKey: string,
  fallbackE164: string,
  fallbackDisplay: string
): { e164: string; display: string } {
  const e164 = normalizeWhatsAppE164(process.env[e164Key] || fallbackE164);
  const display = process.env[displayKey]?.trim() || fallbackDisplay;
  return { e164, display };
}

const defaultChannel = envWhatsApp(
  'NEXT_PUBLIC_PESKIDS_WHATSAPP_E164',
  'NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY',
  DEFAULT_WHATSAPP_E164,
  DEFAULT_WHATSAPP_DISPLAY
);

const llanograndeChannel = envWhatsApp(
  'NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_E164',
  'NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_DISPLAY',
  DEFAULT_LLANOGRANDE_E164,
  DEFAULT_LLANOGRANDE_DISPLAY
);

const domicilioChannel = envWhatsApp(
  'NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_E164',
  'NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_DISPLAY',
  DEFAULT_DOMICILIO_E164,
  DEFAULT_DOMICILIO_DISPLAY
);

export const PESKIDS_CONTACT = {
  email:
    process.env.NEXT_PUBLIC_PESKIDS_CONTACT_EMAIL?.trim() || 'peskidsnatacion@gmail.com',
  whatsapp: {
    ...defaultChannel,
    prefill:
      process.env.NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL?.trim() || PESKIDS_WHATSAPP_INTAKE_PREFILL,
    llanogrande: llanograndeChannel,
    domicilio: domicilioChannel,
  },
} as const;

export function resolveWhatsAppChannel(
  modality?: string | null
): PeskidsWhatsAppChannel {
  if (modality === 'domicilio') return 'domicilio';
  if (modality === 'llanogrande') return 'llanogrande';
  return 'default';
}

export function getWhatsAppContact(channel: PeskidsWhatsAppChannel = 'default'): {
  e164: string;
  display: string;
} {
  if (channel === 'domicilio') return PESKIDS_CONTACT.whatsapp.domicilio;
  if (channel === 'llanogrande') return PESKIDS_CONTACT.whatsapp.llanogrande;
  return { e164: PESKIDS_CONTACT.whatsapp.e164, display: PESKIDS_CONTACT.whatsapp.display };
}

export function buildWhatsAppUrl(options?: {
  prefill?: string;
  channel?: PeskidsWhatsAppChannel;
  modality?: string | null;
}): string {
  const channel = options?.channel ?? resolveWhatsAppChannel(options?.modality);
  const { e164 } = getWhatsAppContact(channel);
  const text = encodeURIComponent(options?.prefill ?? PESKIDS_CONTACT.whatsapp.prefill);
  return `https://wa.me/${e164}?text=${text}`;
}
