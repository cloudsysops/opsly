import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getFranchiseRevenueDashboard } from '@/lib/services/franchise-payment.service';
import { validateFamilyRequest } from '@/lib/family-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

/**
 * GET /api/franchise/revenue
 * Franchise portal endpoint for viewing their own revenue data
 * Only accessible to franchise admins
 */
export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    const auth = await validateFamilyRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    // Get franchise tenant ID from auth context
    const franchiseTenantId = auth.user.id;

    const url = new URL(req.url);
    const period = (url.searchParams.get('period') || 'month') as
      | 'day'
      | 'week'
      | 'month'
      | 'quarter'
      | 'year';

    // Only allow franchises to see their own revenue
    const dashboard = await getFranchiseRevenueDashboard({
      franchiseTenantId,
      period,
    });

    if (dashboard.error) {
      return errorJson(requestId, dashboard.error, 500);
    }

    // Get payment provider configuration
    // @ts-ignore - platform schema access via service role
    const platformDb = supabaseServer().schema('platform');
    const configResult = (await platformDb
      .from('franchise_payment_config')
      .select('payment_provider, revenue_share_percentage, is_active')
      .eq('franchise_tenant_id', franchiseTenantId)
      .eq('is_active', true)
      .single()) as any;

    const paymentConfig = configResult.data;

    return successJson(requestId, {
      summary: {
        totalTransactions: dashboard.totalTransactions,
        totalGrossRevenue: dashboard.totalGrossRevenue,
        totalPeskidsShare: dashboard.totalPeskidsShare,
        totalFranchiseNet: dashboard.totalFranchiseNet,
        period,
        revenueSharePercentage: paymentConfig?.revenue_share_percentage || 0,
        paymentProvider: paymentConfig?.payment_provider || 'unknown',
      },
      byProvider: dashboard.byProvider || [],
      recentTransactions: (dashboard.recentTransactions || []).slice(0, 10).map((tx: any) => ({
        id: tx.id,
        transactionId: tx.transaction_id,
        provider: tx.payment_provider,
        grossAmount: tx.gross_amount_cents,
        franchiseNet: tx.franchise_net_cents,
        peskidsShare: tx.peskids_share_cents,
        status: tx.status,
        createdAt: tx.created_at,
      })),
    });
  } catch (error) {
    console.error('[GET /api/franchise/revenue]', error);
    return errorJson(requestId, 'Failed to fetch revenue data', 500);
  }
}
