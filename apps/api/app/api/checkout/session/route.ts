import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '../../../../lib/stripe';
import { getServiceClient } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

const checkoutSessionSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  slug: z.string().regex(slugRegex, {
    message:
      'El workspace debe tener 3-30 caracteres: solo letras minúsculas, números y guiones (no puede empezar ni terminar con guión)',
  }),
  plan: z.enum(['startup', 'business', 'enterprise']),
});

function getPriceId(plan: 'startup' | 'business' | 'enterprise'): string {
  const map = {
    startup: process.env.STRIPE_PRICE_ID_STARTUP ?? '',
    business: process.env.STRIPE_PRICE_ID_BUSINESS ?? '',
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? '',
  };
  return map[plan];
}

async function slugIsAvailable(slug: string): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    logger.error('checkout.session slugCheck error', error);
    // Fail-open: slug check errors should not block checkout
    return true;
  }
  return data === null;
}

function buildUrls(): { webUrl: string; portalUrl: string } {
  const webUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, '') ??
    `https://web.${process.env.PLATFORM_DOMAIN}`;
  const portalUrl =
    process.env.PORTAL_SITE_URL?.replace(/\/$/, '') ??
    `https://portal.${process.env.PLATFORM_DOMAIN}`;
  return { webUrl, portalUrl };
}

async function createStripeSession(
  email: string,
  slug: string,
  plan: 'startup' | 'business' | 'enterprise',
  priceId: string
): Promise<NextResponse> {
  const { webUrl, portalUrl } = buildUrls();
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    customer_email: email,
    success_url: `${portalUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${webUrl}/#pricing`,
    allow_promotion_codes: true,
    metadata: { tenant_slug: slug, email, plan },
    subscription_data: { metadata: { tenant_slug: slug, plan } },
  });
  logger.info('checkout.session.created', {
    slug,
    plan,
    sessionId: session.id,
  });
  return NextResponse.json({ url: session.url }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = checkoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { email, slug, plan } = parsed.data;

  const priceId = getPriceId(plan);
  if (!priceId) {
    logger.error('checkout.session price id not configured', { plan });
    return NextResponse.json({ error: 'Plan no disponible. Contacta soporte.' }, { status: 503 });
  }

  const available = await slugIsAvailable(slug);
  if (!available) {
    return NextResponse.json(
      { error: 'El nombre del workspace ya está en uso. Elige otro.' },
      { status: 409 }
    );
  }

  try {
    return await createStripeSession(email, slug, plan, priceId);
  } catch (err) {
    logger.error(
      'checkout.session.create failed',
      err instanceof Error ? err : { error: String(err) }
    );
    return NextResponse.json(
      { error: 'Error al crear la sesión de pago. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
