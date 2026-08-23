import Stripe from 'stripe';

// ── Demo stub helpers ───────────────────────────────────────────────
const DEMO_MODE = !process.env.STRIPE_SECRET_KEY;

function mockAccount(overrides: Partial<Stripe.Account> = {}): Stripe.Account {
  return { id: 'acct_demo_123', charges_enabled: true, payouts_enabled: true, ...overrides } as unknown as Stripe.Account;
}
function mockPaymentIntent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
  return { id: 'pi_demo_123', status: 'succeeded', amount: 0, currency: 'usd', ...overrides } as unknown as Stripe.PaymentIntent;
}
// ────────────────────────────────────────────────────────────────────

// Lazy-load Stripe to avoid build-time errors if env var is missing
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// Stripe Connect account types
export type ConnectAccountType = 'express' | 'standard' | 'custom';

// Create Stripe Connect onboarding link for franchisee
export async function createConnectOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  if (DEMO_MODE) return 'https://demo.stripe.com/onboarding';
  const stripe = getStripe();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

// Create Stripe Connect account for franchisee
export async function createConnectAccount(
  email: string,
  businessName: string,
  country: string = 'US'
): Promise<Stripe.Account> {
  if (DEMO_MODE) return mockAccount({ email, business_profile: { name: businessName } as Stripe.Account.BusinessProfile });
  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: 'express', // Express accounts are simplest for franchisees
    country,
    email,
    business_type: 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      us_bank_account_ach_payments: { requested: true },
    },
    business_profile: {
      name: businessName,
      product_description: 'Chess tutoring franchise services',
      mcc: '8299', // Educational services
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'manual', // We handle payouts manually
        },
      },
    },
  });

  return account;
}

// Get Connect account details
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  if (DEMO_MODE) return mockAccount({ id: accountId });
  const stripe = getStripe();
  return stripe.accounts.retrieve(accountId);
}

// Check if Connect account is fully onboarded
export async function isAccountOnboarded(accountId: string): Promise<boolean> {
  const account = await getConnectAccount(accountId);
  return (
    account.charges_enabled === true && account.payouts_enabled === true
  );
}

// Create payment intent to charge franchisee's connected account
export async function createPaymentIntent(
  amount: number, // Amount in cents
  accountId: string,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  if (DEMO_MODE) return mockPaymentIntent({ amount, metadata });
  const stripe = getStripe();

  // Use on_behalf_of to charge the franchisee's account
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    payment_method_types: ['us_bank_account'], // ACH for royalty payments
    on_behalf_of: accountId,
    transfer_data: {
      destination: process.env.STRIPE_PLATFORM_ACCOUNT_ID || '', // Platform receives funds
    },
    metadata,
  });

  return paymentIntent;
}

// Create ACH debit payment from franchisee's bank account
export async function createACHDebit(
  amount: number, // Amount in cents
  accountId: string,
  invoiceId: string,
  franchiseeId: string
): Promise<Stripe.PaymentIntent> {
  if (DEMO_MODE) return mockPaymentIntent({ amount, metadata: { invoiceId, franchiseeId, type: 'royalty_payment' } });
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    payment_method_types: ['us_bank_account'],
    customer: accountId, // The franchisee's Stripe customer ID
    metadata: {
      invoiceId,
      franchiseeId,
      type: 'royalty_payment',
    },
    statement_descriptor: 'ACME ROYALTY',
  });

  return paymentIntent;
}

// Confirm payment intent
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> {
  if (DEMO_MODE) return mockPaymentIntent({ id: paymentIntentId, status: 'succeeded' });
  const stripe = getStripe();

  return stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethodId,
  });
}

// Retrieve payment intent
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  if (DEMO_MODE) return mockPaymentIntent({ id: paymentIntentId });
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

// Cancel payment intent
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  if (DEMO_MODE) return mockPaymentIntent({ id: paymentIntentId, status: 'canceled' });
  const stripe = getStripe();
  return stripe.paymentIntents.cancel(paymentIntentId);
}

// Create refund
export async function createRefund(
  paymentIntentId: string,
  amount?: number // Optional partial refund amount in cents
): Promise<Stripe.Refund> {
  if (DEMO_MODE) return { id: 'ref_demo_123', status: 'succeeded', amount: amount || 0 } as unknown as Stripe.Refund;
  const stripe = getStripe();

  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundParams.amount = amount;
  }

  return stripe.refunds.create(refundParams);
}

// Construct webhook event (for verifying Stripe webhooks)
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Get dashboard link for franchisee's Express account
export async function createExpressDashboardLink(
  accountId: string
): Promise<string> {
  if (DEMO_MODE) return 'https://demo.stripe.com/dashboard';
  const stripe = getStripe();

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}
