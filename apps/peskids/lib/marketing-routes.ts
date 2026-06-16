/** Rutas públicas de marketing: sin chat embebido, solo WhatsApp como canal principal. */
export function isPeskidsPublicLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/instagram' || pathname === '/familias') return true;
  if (pathname.startsWith('/reserva-clase-gratuita')) return true;
  return pathname.startsWith('/familias/login');
}

/** CTAs de reserva en páginas públicas → WhatsApp, no chat interno. */
export const PESKIDS_PUBLIC_RESERVA_WHATSAPP_LABEL = 'Reservar por WhatsApp';
