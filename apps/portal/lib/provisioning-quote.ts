import type { ProvisioningQuoteRequest, ProvisioningQuoteResponse } from '@/types';
import { getApiBaseUrl } from './api';

/**
 * Cotización mensual (infra proveedor + fee Opsly). Endpoint público de API.
 */
export async function fetchProvisioningQuote(
  body: ProvisioningQuoteRequest
): Promise<ProvisioningQuoteResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/provisioning/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json === 'object' &&
      json !== null &&
      'message' in json &&
      typeof (json as { message: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `Cotización falló (${res.status})`;
    throw new Error(msg);
  }

  return json as ProvisioningQuoteResponse;
}
