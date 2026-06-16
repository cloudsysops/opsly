/** Rutas públicas de marketing: sin chat embebido, solo WhatsApp como canal principal. */
export function isPeskidsPublicLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/instagram') return true;
  return pathname.startsWith('/reserva-clase-gratuita');
}
