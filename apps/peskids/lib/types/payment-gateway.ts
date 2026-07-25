/**
 * Payment Gateway Types - Unified interface for Stripe and Wompi
 */

export type PaymentProvider = 'stripe' | 'wompi';

export type PaymentStatus = 'pending' | 'processing' | 'approved' | 'failed' | 'cancelled';

export interface PaymentIntent {
  provider: PaymentProvider;
  id: string;
  clientSecret?: string; // Stripe only
  checkoutUrl?: string; // Wompi only
  status: string;
}

export interface WebhookEvent {
  provider: PaymentProvider;
  type: string;
  id: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface FranchisePaymentConfig {
  tenant_id: string;
  provider: PaymentProvider;
  stripe_account_id?: string; // Connected Account ID for Stripe
  stripe_api_key?: string;
  wompi_public_key?: string;
  wompi_private_key?: string;
  revenue_share_percentage: number; // e.g., 20 for 20%
  is_active: boolean;
}

export interface FranchiseTransaction {
  id: string;
  franchise_tenant_id: string;
  transaction_id: string;
  gross_amount_cents: number;
  peskids_share_cents: number;
  franchise_net_cents: number;
  revenue_share_percentage: number;
  status: PaymentStatus;
  provider: PaymentProvider;
  peskids_payout_id?: string;
  peskids_payout_date?: Date;
  created_at: Date;
  updated_at: Date;
}
