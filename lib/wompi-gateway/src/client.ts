import { createHash, timingSafeEqual } from 'node:crypto';

export interface WompiPaymentLinkRequest {
  name: string;
  description: string;
  amountInCents: number;
  redirectUrl: string;
  singleUse?: boolean;
  collectShipping?: boolean;
  /** Wompi Colombia payment links only settle in COP. */
  currency?: 'COP';
}

export interface WompiPaymentLinkResult {
  paymentLinkId: string;
  checkoutUrl: string;
}

export type WompiWebhookEvent = {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  signature: { checksum: string; properties: string[] };
};

function resolveDotPath(source: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
  return value === null || value === undefined ? '' : String(value);
}

export class WompiClient {
  private readonly privateKey: string;

  constructor(options: { privateKey: string }) {
    this.privateKey = options.privateKey;
  }

  /** Wompi key prefixes are self-describing (prv_test_ / prv_prod_) — no separate env var needed. */
  get baseUrl(): string {
    return this.privateKey.startsWith('prv_prod_')
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';
  }

  async createPaymentLink(
    input: WompiPaymentLinkRequest
  ): Promise<WompiPaymentLinkResult> {
    const response = await fetch(`${this.baseUrl}/payment_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        single_use: input.singleUse ?? true,
        collect_shipping: input.collectShipping ?? false,
        currency: input.currency ?? 'COP',
        amount_in_cents: input.amountInCents,
        redirect_url: input.redirectUrl,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wompi payment link failed: ${text.slice(0, 200)}`);
    }

    const body = (await response.json()) as { data: { id: string } };
    return {
      paymentLinkId: body.data.id,
      checkoutUrl: `https://checkout.wompi.co/l/${body.data.id}`,
    };
  }
}

/**
 * Verifies a Wompi event webhook and returns the parsed event if valid.
 *
 * Algorithm (per Wompi Colombia docs): SHA256 of the concatenation of the
 * values referenced by signature.properties (dot-paths into `data`, in the
 * order given — never hardcode which properties to expect, Wompi documents
 * that the property list can vary per event type), followed by the event
 * timestamp, followed by the events secret. Compared against
 * signature.checksum.
 */
export function verifyWompiWebhookSignature(
  rawBody: string,
  eventsSecret: string
): WompiWebhookEvent | null {
  if (!eventsSecret) return null;

  let parsed: WompiWebhookEvent;
  try {
    parsed = JSON.parse(rawBody) as WompiWebhookEvent;
  } catch {
    return null;
  }

  const { data, timestamp, signature } = parsed;
  if (!data || !timestamp || !signature?.checksum || !Array.isArray(signature.properties)) {
    return null;
  }

  const concatenated =
    signature.properties.map((path) => resolveDotPath(data, path)).join('') +
    String(timestamp) +
    eventsSecret;

  const expected = createHash('sha256').update(concatenated).digest('hex');

  try {
    const isValid = timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature.checksum.toLowerCase(), 'hex')
    );
    return isValid ? parsed : null;
  } catch {
    return null;
  }
}
