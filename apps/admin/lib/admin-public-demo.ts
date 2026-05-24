/**
 * Modo demo del panel admin (sin login). Solo permitido fuera de producción
 * y con flag explícito en build — nunca por defecto en imágenes GHCR.
 */
export function isAdminPublicDemoEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO === 'true';
}
