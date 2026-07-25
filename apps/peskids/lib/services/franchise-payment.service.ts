import { supabaseServer } from '@/lib/supabase';
import type { PaymentProvider, FranchiseTransaction } from '@/lib/types/payment-gateway';

/**
 * Franchise Payment Service
 * Handles revenue sharing between Peskids (parent) and franchises.
 * Supports Stripe Connected Accounts and Wompi for multi-provider flexibility.
 *
 * Note: This service accesses the platform schema via admin/service role.
 * Since platform schema is not in peskids types, we cast to any for schema access.
 */

const PLATFORM_SCHEMA = 'platform';

function platformClient() {
  // @ts-ignore - platform schema access via service role (multi-tenant pattern)
  return supabaseServer().schema(PLATFORM_SCHEMA);
}

/**
 * Set up payment provider for a franchise
 * Stripe: Creates Connected Account and stores account ID
 * Wompi: Stores API keys for OAuth flow
 */
export async function setupFranchisePaymentProvider(input: {
  franchiseTenantId: string;
  provider: PaymentProvider;
  revenuSharePercentage: number; // e.g., 20 for 20%
  stripeAccountId?: string;
  wompApiKey?: string;
}): Promise<{
  success: boolean;
  configId?: string;
  error?: string;
}> {
  try {
    if (input.revenuSharePercentage < 0 || input.revenuSharePercentage > 100) {
      return {
        success: false,
        error: 'Revenue share percentage must be between 0 and 100',
      };
    }

    // Store provider configuration in database
    const result = (await (platformClient()
      .from('franchise_payment_config')
      .insert({
        franchise_tenant_id: input.franchiseTenantId,
        payment_provider: input.provider,
        stripe_connected_account_id: input.stripeAccountId || null,
        wompi_api_key: input.wompApiKey || null,
        revenue_share_percentage: input.revenuSharePercentage,
        is_active: true,
        created_at: new Date().toISOString(),
      } as any)
      .select('id')
      .single())) as any;

    if (result.error) throw result.error;

    return {
      success: true,
      configId: result.data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a payment with automatic revenue sharing
 * Creates payment on franchise account, then transfers Peskids share
 */
export async function processPaymentWithRevenueShare(input: {
  franchiseTenantId: string;
  amountCents: number;
  description: string;
  currency?: string;
  orderId?: string;
  studentId?: string;
  metadata?: Record<string, string>;
}): Promise<{
  success: boolean;
  transactionId?: string;
  franchiseNetCents?: number;
  peskidsShareCents?: number;
  error?: string;
}> {
  try {
    // Get franchise payment config
    const configResult = (await platformClient()
      .from('franchise_payment_config')
      .select('*')
      .eq('franchise_tenant_id', input.franchiseTenantId)
      .eq('is_active', true)
      .single()) as any;

    if (configResult.error || !configResult.data) {
      return {
        success: false,
        error: 'Payment provider not configured for franchise',
      };
    }

    const config = configResult.data;

    // Calculate revenue share
    const revenueSharePercentage = config.revenue_share_percentage;
    const peskidsShareCents = Math.round(
      input.amountCents * (revenueSharePercentage / 100)
    );
    const franchiseNetCents = input.amountCents - peskidsShareCents;

    // Process payment based on provider
    let paymentResult;
    if (config.payment_provider === 'stripe') {
      paymentResult = await processStripePaymentWithRevenuShare({
        franchiseTenantId: input.franchiseTenantId,
        stripeConnectedAccountId: config.stripe_connected_account_id,
        amountCents: input.amountCents,
        franchiseNetCents,
        peskidsShareCents,
        description: input.description,
        metadata: input.metadata,
      });
    } else if (config.payment_provider === 'wompi') {
      paymentResult = await processWompiPaymentWithRevenuShare({
        franchiseTenantId: input.franchiseTenantId,
        amountCents: input.amountCents,
        franchiseNetCents,
        peskidsShareCents,
        description: input.description,
        metadata: input.metadata,
      });
    } else {
      return {
        success: false,
        error: `Unsupported payment provider: ${config.payment_provider}`,
      };
    }

    if (!paymentResult.success) {
      return paymentResult;
    }

    // Record transaction in franchise_revenue_tracking
    const trackResult = (await (platformClient()
      .from('franchise_revenue_tracking')
      .insert({
        franchise_tenant_id: input.franchiseTenantId,
        transaction_id: paymentResult.transactionId,
        gross_amount_cents: input.amountCents,
        peskids_share_cents: peskidsShareCents,
        franchise_net_cents: franchiseNetCents,
        revenue_share_percentage: revenueSharePercentage,
        status: 'pending',
        payment_provider: config.payment_provider,
        order_id: input.orderId || null,
        student_id: input.studentId || null,
        created_at: new Date().toISOString(),
      } as any)
      .select('id')
      .single())) as any;

    if (trackResult.error) throw trackResult.error;
    const transaction = trackResult.data;

    return {
      success: true,
      transactionId: transaction.id,
      franchiseNetCents,
      peskidsShareCents,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed',
    };
  }
}

/**
 * Process Stripe payment with automatic payout to Peskids account
 */
async function processStripePaymentWithRevenuShare(input: {
  franchiseTenantId: string;
  stripeConnectedAccountId?: string;
  amountCents: number;
  franchiseNetCents: number;
  peskidsShareCents: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    if (!input.stripeConnectedAccountId) {
      return {
        success: false,
        error: 'Stripe Connected Account ID not configured',
      };
    }

    // TODO: Implement actual Stripe Connected Account payment processing
    // This would involve:
    // 1. Creating Payment Intent on Connected Account
    // 2. Charging the customer
    // 3. Creating automatic transfer to Peskids account
    // 4. Setting up webhook to track transfer completion

    // For now, return success with mock transaction ID
    const transactionId = `stripe_${Date.now()}`;

    return {
      success: true,
      transactionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stripe processing failed',
    };
  }
}

/**
 * Process Wompi payment with automatic payout to Peskids account
 */
async function processWompiPaymentWithRevenuShare(_input: {
  franchiseTenantId: string;
  amountCents: number;
  franchiseNetCents: number;
  peskidsShareCents: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    // TODO: Implement actual Wompi payment processing
    // This would involve:
    // 1. Creating Payment Link via Wompi API
    // 2. Processing payment through Wompi
    // 3. Automatic transfer to Peskids account (if Wompi supports)
    // 4. Webhook handling for payment confirmation

    // For now, return success with mock transaction ID
    const transactionId = `wompi_${Date.now()}`;

    return {
      success: true,
      transactionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wompi processing failed',
    };
  }
}

/**
 * Mark transaction as paid after webhook confirmation
 */
export async function markTransactionAsPaid(input: {
  transactionId: string;
  payoutId?: string;
  payoutDate?: Date;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const updateResult = (await ((platformClient() as any)
      .from('franchise_revenue_tracking')
      .update({
        status: 'paid',
        peskids_payout_id: input.payoutId || null,
        peskids_payout_date: input.payoutDate?.toISOString() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.transactionId))) as any;

    if (updateResult.error) throw updateResult.error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transaction',
    };
  }
}

/**
 * Get revenue tracking dashboard for Peskids admin
 */
export async function getFranchiseRevenueDashboard(input?: {
  franchiseTenantId?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}): Promise<{
  totalTransactions: number;
  totalGrossRevenue: number;
  totalPeskidsShare: number;
  totalFranchiseNet: number;
  byFranchise?: Array<{
    franchiseTenantId: string;
    transactionCount: number;
    grossRevenue: number;
    peskidsShare: number;
    franchiseNet: number;
  }>;
  byProvider?: Array<{
    provider: PaymentProvider;
    transactionCount: number;
    grossRevenue: number;
    peskidsShare: number;
  }>;
  recentTransactions?: FranchiseTransaction[];
  error?: string;
}> {
  try {
    let query = (platformClient().from('franchise_revenue_tracking').select('*') as any);

    if (input?.franchiseTenantId) {
      query = query.eq('franchise_tenant_id', input.franchiseTenantId);
    }

    // Filter by date range if period specified
    if (input?.period) {
      const dateFilter = getDateRangeFilter(input.period);
      query = query.gte('created_at', dateFilter.start).lte('created_at', dateFilter.end);
    }

    const result = (await query.order('created_at', { ascending: false })) as any;

    if (result.error) throw result.error;

    const transactions = (result.data || []) as any[];

    // Aggregate totals
    const totals = transactions.reduce(
      (acc, tx) => ({
        count: acc.count + 1,
        gross: acc.gross + (tx.gross_amount_cents || 0),
        peskids: acc.peskids + (tx.peskids_share_cents || 0),
        franchise: acc.franchise + (tx.franchise_net_cents || 0),
      }),
      { count: 0, gross: 0, peskids: 0, franchise: 0 }
    );

    // Group by franchise if not filtered
    const byFranchise = !input?.franchiseTenantId
      ? Object.entries(
          transactions.reduce<Record<string, (typeof transactions)[0][]>>((acc, tx) => {
            if (!acc[tx.franchise_tenant_id]) acc[tx.franchise_tenant_id] = [];
            acc[tx.franchise_tenant_id].push(tx);
            return acc;
          }, {})
        ).map(([franchiseId, txs]) => ({
          franchiseTenantId: franchiseId,
          transactionCount: txs.length,
          grossRevenue: txs.reduce((sum, tx) => sum + (tx.gross_amount_cents || 0), 0),
          peskidsShare: txs.reduce((sum, tx) => sum + (tx.peskids_share_cents || 0), 0),
          franchiseNet: txs.reduce((sum, tx) => sum + (tx.franchise_net_cents || 0), 0),
        }))
      : undefined;

    // Group by provider
    const byProvider = Object.entries(
      transactions.reduce<Record<string, (typeof transactions)[0][]>>((acc, tx) => {
        if (!acc[tx.payment_provider]) acc[tx.payment_provider] = [];
        acc[tx.payment_provider].push(tx);
        return acc;
      }, {})
    ).map(([provider, txs]) => ({
      provider: provider as PaymentProvider,
      transactionCount: txs.length,
      grossRevenue: txs.reduce((sum, tx) => sum + (tx.gross_amount_cents || 0), 0),
      peskidsShare: txs.reduce((sum, tx) => sum + (tx.peskids_share_cents || 0), 0),
    }));

    return {
      totalTransactions: totals.count,
      totalGrossRevenue: totals.gross,
      totalPeskidsShare: totals.peskids,
      totalFranchiseNet: totals.franchise,
      byFranchise,
      byProvider,
      recentTransactions: transactions.slice(0, 20) as FranchiseTransaction[],
    };
  } catch (error) {
    return {
      totalTransactions: 0,
      totalGrossRevenue: 0,
      totalPeskidsShare: 0,
      totalFranchiseNet: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard',
    };
  }
}

/**
 * Helper function to calculate date range for dashboard filters
 */
function getDateRangeFilter(period: 'day' | 'week' | 'month' | 'quarter' | 'year') {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}
