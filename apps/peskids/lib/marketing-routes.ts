/** Rutas públicas de marketing: captura de lead vía formulario antes de WhatsApp humano. */
export function isPeskidsPublicLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/instagram' || pathname === '/familias') return true;
  if (pathname.startsWith('/reserva-clase-gratuita')) return true;
  return pathname.startsWith('/familias/login');
}

/** CTAs de reserva en páginas públicas → formulario en home, no WhatsApp directo. */
export const PESKIDS_PUBLIC_RESERVA_FORM_LABEL = 'Reservar clase gratuita';

/** @deprecated Use PESKIDS_PUBLIC_RESERVA_FORM_LABEL — kept for import compatibility. */
export const PESKIDS_PUBLIC_RESERVA_WHATSAPP_LABEL = PESKIDS_PUBLIC_RESERVA_FORM_LABEL;
