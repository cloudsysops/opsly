import { adminAuth } from '@intcloudsysops/security';
import { getFranchiseRevenueDashboard } from '@/lib/services/franchise-payment.service';

/**
 * GET /api/admin/franchises/revenue
 * Admin dashboard endpoint for franchise revenue tracking
 * Shows consolidated revenue, by franchise, by payment provider
 */
export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const url = new URL(req.url);
    const franchiseTenantId = url.searchParams.get('franchise_id');
    const period = (url.searchParams.get('period') || 'month') as
      | 'day'
      | 'week'
      | 'month'
      | 'quarter'
      | 'year';

    const dashboard = await getFranchiseRevenueDashboard({
      franchiseTenantId: franchiseTenantId || undefined,
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
          },
          byFranchise: dashboard.byFranchise || [],
          byProvider: dashboard.byProvider || [],
          recentTransactions: dashboard.recentTransactions || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Revenue dashboard error:', error);
    return Response.json(
      {
        ok: false,
        error: 'Failed to fetch revenue dashboard',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
