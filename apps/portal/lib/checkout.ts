'use server';

import { getRuntimeApiBaseUrl } from '@/lib/runtime-env';

export type CheckoutPlan = 'startup' | 'business';

export interface CheckoutResult {
  url: string;
}

export async function createCheckoutSession(
  email: string,
  slug: string,
  plan: CheckoutPlan
): Promise<CheckoutResult> {
  const apiBase = getRuntimeApiBaseUrl() || 'http://localhost:3000';
  const res = await fetch(`${apiBase}/api/checkout/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, slug, plan }),
  });

  const body: Record<string, unknown> = await res.json();

  if (!res.ok) {
    const err = new Error((body.error as string) ?? 'Error al crear sesión de pago');
    const meta = err as unknown as Record<string, unknown>;
    meta.details = body.details;
    meta.status = res.status;
    throw err;
  }

  return body as unknown as CheckoutResult;
}
