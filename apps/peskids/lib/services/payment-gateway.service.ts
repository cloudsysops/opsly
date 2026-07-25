import { PaymentProvider, PaymentIntent, WebhookEvent } from '@/lib/types/payment-gateway';

/**
 * Unified payment gateway service supporting Stripe and Wompi.
 * Abstracts provider-specific logic for processing payments, managing accounts,
 * and handling webhooks.
 */

interface PaymentGatewayConfig {
  provider: PaymentProvider;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  wompiPublicKey?: string;
  wompiPrivateKey?: string;
  wompiEventsSecret?: string;
}

export class PaymentGateway {
  private provider: PaymentProvider;
  private stripeSecretKey?: string;
  private wompiPrivateKey?: string;
  private wompiEventsSecret?: string;

  constructor(config: PaymentGatewayConfig) {
    this.provider = config.provider;
    this.stripeSecretKey = config.stripeSecretKey;
    this.wompiPrivateKey = config.wompiPrivateKey;
    this.wompiEventsSecret = config.wompiEventsSecret;

    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.provider === 'stripe' && !this.stripeSecretKey) {
      throw new Error('Stripe configuration missing: STRIPE_SECRET_KEY required');
    }
    if (this.provider === 'wompi' && !this.wompiPrivateKey) {
      throw new Error('Wompi configuration missing: WOMPI_PRIVATE_KEY required');
    }
  }

  /**
   * Create a payment intent for a customer
   */
  async createPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    description: string;
    metadata?: Record<string, string>;
    returnUrl?: string;
  }): Promise<PaymentIntent> {
    if (this.provider === 'stripe') {
      return this.createStripePaymentIntent(params);
    }
    if (this.provider === 'wompi') {
      return this.createWompiPaymentIntent(params);
    }
    throw new Error(`Unsupported payment provider: ${this.provider}`);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
  ): boolean {
    if (this.provider === 'stripe') {
      return this.verifyStripeSignature(rawBody, signatureHeader);
    }
    if (this.provider === 'wompi') {
      return this.verifyWompiSignature(rawBody, signatureHeader);
    }
    return false;
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    if (this.provider === 'stripe') {
      return this.parseStripeWebhookEvent(rawBody);
    }
    if (this.provider === 'wompi') {
      return this.parseWompiWebhookEvent(rawBody);
    }
    return null;
  }

  // ========================
  // STRIPE IMPLEMENTATION
  // ========================

  private async createStripePaymentIntent(params: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
    returnUrl?: string;
  }): Promise<PaymentIntent> {
    if (!this.stripeSecretKey) throw new Error('Stripe not configured');

    const formData = new URLSearchParams();
    formData.append('amount', String(params.amount));
    formData.append('currency', params.currency);
    formData.append('description', params.description);

    Object.entries(params.metadata || {}).forEach(([key, value]) => {
      formData.append(`metadata[${key}]`, value);
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${error.slice(0, 200)}`);
    }

    const intent = (await response.json()) as {
      id: string;
      client_secret: string;
      status: string;
    };

    return {
      provider: 'stripe',
      id: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
    };
  }

  private verifyStripeSignature(payload: string, signatureHeader: string | null): boolean {
    if (!this.stripeSecretKey || !signatureHeader) return false;

    const { createHmac, timingSafeEqual } = require('crypto');
    const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac('sha256', this.stripeSecretKey)
      .update(signedPayload)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private parseStripeWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const event = JSON.parse(rawBody);
      return {
        provider: 'stripe',
        type: event.type,
        id: event.id,
        data: event.data,
        timestamp: new Date(event.created * 1000),
      };
    } catch {
      return null;
    }
  }

  // ========================
  // WOMPI IMPLEMENTATION
  // ========================

  private async createWompiPaymentIntent(params: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
    returnUrl?: string;
  }): Promise<PaymentIntent> {
    if (!this.wompiPrivateKey) throw new Error('Wompi not configured');

    // Note: This is a placeholder. Wompi API integration would be implemented
    // using the WompiClient from @intcloudsysops/wompi-gateway
    // For now, we're showing the structure
    const response = await fetch('https://api.wompi.co/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.wompiPrivateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.description,
        description: params.description,
        amount_in_cents: params.amount,
        currency: params.currency.toUpperCase(),
        redirect_url: params.returnUrl,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wompi API error: ${error.slice(0, 200)}`);
    }

    const link = (await response.json()) as {
      id: string;
      checkout_url: string;
      status: string;
    };

    return {
      provider: 'wompi',
      id: link.id,
      checkoutUrl: link.checkout_url,
      status: link.status,
    };
  }

  private verifyWompiSignature(
    rawBody: string,
    signatureHeader: string | null
  ): boolean {
    if (!this.wompiEventsSecret || !signatureHeader) return false;

    const { createHmac, timingSafeEqual } = require('crypto');
    const expected = createHmac('sha256', this.wompiEventsSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  private parseWompiWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const event = JSON.parse(rawBody);
      return {
        provider: 'wompi',
        type: event.event,
        id: event.data?.id || event.id,
        data: event.data,
        timestamp: new Date(event.timestamp || Date.now()),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the provider type
   */
  getProvider(): PaymentProvider {
    return this.provider;
  }
}

/**
 * Factory function to create payment gateway from environment variables
 */
export function createPaymentGateway(
  provider: PaymentProvider = 'stripe'
): PaymentGateway {
  return new PaymentGateway({
    provider,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim(),
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim(),
    wompiPublicKey: process.env.WOMPI_PUBLIC_KEY?.trim(),
    wompiPrivateKey: process.env.WOMPI_PRIVATE_KEY?.trim(),
    wompiEventsSecret: process.env.WOMPI_EVENTS_SECRET?.trim(),
  });
}
