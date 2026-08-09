/**
 * Canales de contacto Peskids (web pública).
 * Números por env en Doppler / runtime — sin hardcodear en componentes.
 * Llanogrande y Domicilios pueden tener WhatsApp distintos.
 */

import { PESKIDS_WHATSAPP_INTAKE_PREFILL } from '@/lib/peskids-intake-messages';

/** Public catalog numbers (also in apps/peskids/.env.example) — not secrets. */
const DEFAULT_WHATSAPP_E164 = '573054702600';
const DEFAULT_WHATSAPP_DISPLAY = '+57 305 470 2600';
/** Domicilios line — must NOT fall back to sede when env/build-args are missing. */
const DEFAULT_DOMICILIO_E164 = '573054790273';
const DEFAULT_DOMICILIO_DISPLAY = '+57 305 479 0273';
const DEFAULT_LLANOGRANDE_E164 = DEFAULT_WHATSAPP_E164;
const DEFAULT_LLANOGRANDE_DISPLAY = DEFAULT_WHATSAPP_DISPLAY;

export type PeskidsWhatsAppChannel = 'default' | 'llanogrande' | 'domicilio';

/** Solo dígitos E.164 sin + (ej. 573001234567). */
export function normalizeWhatsAppE164(
  raw: string | undefined,
  fallback: string = DEFAULT_WHATSAPP_E164
): string {
  if (!raw?.trim()) return fallback;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return fallback;
  return digits;
}

function envWhatsApp(
  e164Key: string,
  displayKey: string,
  fallbackE164: string,
  fallbackDisplay: string
): { e164: string; display: string } {
  const e164 = normalizeWhatsAppE164(process.env[e164Key] || fallbackE164, fallbackE164);
  const display = process.env[displayKey]?.trim() || fallbackDisplay;
  return { e164, display };
}

/** Resolve at call time so server runtime (Doppler env-file) and build-time NEXT_PUBLIC both work. */
function resolveDefaultChannel(): { e164: string; display: string } {
  return envWhatsApp(
    'NEXT_PUBLIC_PESKIDS_WHATSAPP_E164',
    'NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY',
    DEFAULT_WHATSAPP_E164,
    DEFAULT_WHATSAPP_DISPLAY
  );
}

function resolveLlanograndeChannel(): { e164: string; display: string } {
  return envWhatsApp(
    'NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_E164',
    'NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_DISPLAY',
    DEFAULT_LLANOGRANDE_E164,
    DEFAULT_LLANOGRANDE_DISPLAY
  );
}

function resolveDomicilioChannel(): { e164: string; display: string } {
  return envWhatsApp(
    'NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_E164',
    'NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_DISPLAY',
    DEFAULT_DOMICILIO_E164,
    DEFAULT_DOMICILIO_DISPLAY
  );
}

export const PESKIDS_CONTACT = {
  get email(): string {
    return (
      process.env.NEXT_PUBLIC_PESKIDS_CONTACT_EMAIL?.trim() || 'peskidsnatacion@gmail.com'
    );
  },
  get whatsapp() {
    const defaultChannel = resolveDefaultChannel();
    return {
      ...defaultChannel,
      prefill:
        process.env.NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL?.trim() ||
        PESKIDS_WHATSAPP_INTAKE_PREFILL,
      llanogrande: resolveLlanograndeChannel(),
      domicilio: resolveDomicilioChannel(),
    };
  },
};

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
