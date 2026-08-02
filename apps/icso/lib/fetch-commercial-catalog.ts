import type { CommercialCatalog } from './commercial-catalog';

function resolveOpslyApiBaseUrl(): string {
  const fromEnv = process.env.OPSLY_API_URL?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:3000';
}

/**
 * Server-only: loads the live commercial catalog from apps/api.
 * Failures throw — sales pages must not silently show stale prices.
 */
export async function fetchCommercialCatalog(): Promise<CommercialCatalog> {
  const url = `${resolveOpslyApiBaseUrl()}/api/icso/catalog/public`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`No se pudo cargar el catálogo (HTTP ${response.status})`);
  }
  const body = (await response.json()) as { catalog?: CommercialCatalog };
  if (!body.catalog || typeof body.catalog !== 'object') {
    throw new Error('No se pudo cargar el catálogo (respuesta inválida)');
  }
  return body.catalog;
}
