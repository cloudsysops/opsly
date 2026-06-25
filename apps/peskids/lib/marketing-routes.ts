import {
  PESKIDS_RESERVATION_FORM_HREF,
  peskidsPublicLeadFormUrl,
} from '@/lib/peskids-landing-config';

/** Rutas legales enlazadas desde el footer de marketing (misma política form-first). */
const PESKIDS_LEGAL_LANDING_PATHS = [
  '/privacy',
  '/terms',
  '/cookies',
  '/aviso-parental',
  '/dsar',
] as const;

/**
 * Rutas públicas de marketing: captura de lead vía formulario antes de WhatsApp humano.
 * Incluye home, landings de campaña, showcase familias y páginas legales del footer.
 */
export function isPeskidsPublicLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/instagram' || pathname === '/familias') return true;
  if (pathname.startsWith('/reserva-clase-gratuita')) return true;
  if (pathname.startsWith('/familias/login')) return true;
  return PESKIDS_LEGAL_LANDING_PATHS.some(
    (legalPath) => pathname === legalPath || pathname.startsWith(`${legalPath}/`)
  );
}

/** CTAs de reserva en páginas públicas → formulario en home, no WhatsApp directo. */
export const PESKIDS_PUBLIC_RESERVA_FORM_LABEL = 'Reservar clase gratuita';

/** @deprecated Use PESKIDS_PUBLIC_RESERVA_FORM_LABEL — kept for import compatibility. */
export const PESKIDS_PUBLIC_RESERVA_WHATSAPP_LABEL = PESKIDS_PUBLIC_RESERVA_FORM_LABEL;

export const PESKIDS_ADMISSIONS_CHAT_FORM_REPLY =
  'Para reservar tu clase gratuita, completa primero el formulario con tu nombre, correo y consentimiento. Después podrás continuar por WhatsApp si lo prefieres.';

/** Payload when web chat tries admissions intake without the lead form. */
export function peskidsAdmissionsChatFormRedirectPayload(): {
  ok: true;
  message_id: null;
  draft_id: null;
  reply: string;
  stage: 'form_required';
  progress: 0;
  profile: null;
  support_draft: null;
  input_mode: 'text';
  quick_replies: [];
  from_llm: false;
  disclaimer: string;
} {
  return {
    ok: true,
    message_id: null,
    draft_id: null,
    reply: `${PESKIDS_ADMISSIONS_CHAT_FORM_REPLY}\n\n👉 ${peskidsPublicLeadFormUrl()}`,
    stage: 'form_required',
    progress: 0,
    profile: null,
    support_draft: null,
    input_mode: 'text',
    quick_replies: [],
    from_llm: false,
    disclaimer: 'La solicitud oficial de clase de prueba se registra solo con el formulario web.',
  };
}

export { PESKIDS_RESERVATION_FORM_HREF };
