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

/** CTAs públicos → chat de información primero; formulario clásico como alternativa. */
export const PESKIDS_PUBLIC_RESERVA_FORM_LABEL = 'Hablar con el asistente';

/** Etiqueta del botón WhatsApp en landing (gate: chat primero). */
export const PESKIDS_PUBLIC_WHATSAPP_LABEL = 'WhatsApp';

/** @deprecated Use PESKIDS_PUBLIC_WHATSAPP_LABEL */
export const PESKIDS_PUBLIC_RESERVA_WHATSAPP_LABEL = PESKIDS_PUBLIC_WHATSAPP_LABEL;

export const PESKIDS_ADMISSIONS_CHAT_FORM_REPLY =
  'Puedes completar tu solicitud por el chat de información en la página (recomendado) o usar el formulario clásico. Al terminar te conectamos por WhatsApp con el equipo correcto.';

/** @deprecated Admissions chat now runs interactive intake; kept for older clients/tests. */
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
    disclaimer: 'El chat de información guarda la solicitud en la plataforma antes del WhatsApp humano.',
  };
}

export { PESKIDS_RESERVATION_FORM_HREF };
