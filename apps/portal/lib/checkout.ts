'use server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export type CheckoutPlan = 'startup' | 'business';

export interface CheckoutResult {
  url: string;
}

export async function createCheckoutSession(
  email: string,
  slug: string,
  plan: CheckoutPlan
): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/api/checkout/session`, {
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
