import { supabaseServer } from '@/lib/supabase';
import { getFranchiseRevenueDashboard } from '@/lib/services/franchise-payment.service';
import { resolveTrustedPortalSession } from '@/lib/runtime/portal-security';

/**
 * GET /api/franchise/revenue
 * Franchise portal endpoint for viewing their own revenue data
 * Only accessible to franchise admins
 */
export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const session = await resolveTrustedPortalSession(req);
    if (!session) {
      return Response.json(
        {
          ok: false,
          error: 'Unauthorized',
          request_id: requestId,
        },
        { status: 401 }
      );
    }

    // Get franchise tenant ID from session
    const franchiseTenantId = session.tenantId;

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
      return Response.json(
        {
          ok: false,
          error: dashboard.error,
          request_id: requestId,
        },
        { status: 500 }
      );
    }

    // Get payment provider configuration
    const platformDb = supabaseServer().schema('platform');
    const { data: paymentConfig, error: configError } = await platformDb
      .from('franchise_payment_config')
      .select('payment_provider, revenue_share_percentage, is_active')
      .eq('franchise_tenant_id', franchiseTenantId)
      .eq('is_active', true)
      .single();

    return Response.json(
      {
        ok: true,
        data: {
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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Franchise revenue endpoint error:', error);
    return Response.json(
      {
        ok: false,
        error: 'Failed to fetch revenue data',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
