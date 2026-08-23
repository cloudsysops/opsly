import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/royalties/history - Get historical royalty data with breakdown
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const franchiseeAccountId = prospect.franchiseeAccount.id;
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12');

    // Get invoices with payments
    const invoices = await db.royaltyInvoice.findMany({
      where: { franchiseeAccountId },
      include: {
        payments: {
          where: { status: 'SUCCEEDED' },
          orderBy: { processedAt: 'desc' },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months,
    });

    // Get monthly snapshots for revenue breakdown
    const snapshots = await db.tutorCruncherSnapshot.findMany({
      where: { franchiseeAccountId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months,
    });

    // Calculate summary stats
    const totalRoyalties = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const totalPaid = invoices
      .flatMap((i) => i.payments)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDisputed = invoices
      .filter((i) => i.status === 'DISPUTED')
      .reduce((sum, i) => sum + Number(i.totalAmount), 0);

    // Build monthly history with comparison
    const history = invoices.map((invoice: any) => {
      const snapshot = snapshots.find(
        (s: any) => s.year === invoice.year && s.month === invoice.month
      );
      const rawData = (snapshot?.rawData as Record<string, unknown>) || {};

      return {
        year: invoice.year,
        month: invoice.month,
        invoiceNumber: invoice.invoiceNumber,
        grossRevenue: Number(invoice.grossRevenue),
        royaltyAmount: Number(invoice.royaltyAmount),
        brandFund: Number(invoice.brandFundAmount),
        systemsFee: Number(invoice.systemsFeeAmount),
        totalAmount: Number(invoice.totalAmount),
        status: invoice.status,
        paidAt: invoice.paidAt,
        revenueBreakdown: {
          home: Number(rawData.homeRevenue || 0),
          online: Number(rawData.onlineRevenue || 0),
          retail: Number(rawData.retailRevenue || 0),
          schools: Number(rawData.schoolRevenue || 0),
          other: Number(rawData.otherRevenue || 0),
        },
        tutorPay: Number(rawData.tutorPay || 0),
        grossProfit: Number(rawData.grossProfit || 0),
        marginPercent: Number(rawData.marginPercent || 0),
      };
    });

    // Calculate YoY comparison if we have enough data
    const currentYear = new Date().getFullYear();
    const currentYearData = history.filter((h) => h.year === currentYear);
    const previousYearData = history.filter((h) => h.year === currentYear - 1);

    const currentYearTotal = currentYearData.reduce((sum, h) => sum + h.grossRevenue, 0);
    const previousYearTotal = previousYearData.reduce((sum, h) => sum + h.grossRevenue, 0);
    const yoyGrowth =
      previousYearTotal > 0
        ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100
        : 0;

    // Calculate MoM comparison
    const latestMonth = history[0];
    const previousMonth = history[1];
    const momGrowth =
      previousMonth && previousMonth.grossRevenue > 0
        ? ((latestMonth.grossRevenue - previousMonth.grossRevenue) / previousMonth.grossRevenue) * 100
        : 0;

    return NextResponse.json({
      history,
      summary: {
        totalRoyalties,
        totalPaid,
        outstanding: totalRoyalties - totalPaid,
        totalDisputed,
        currentYearRevenue: currentYearTotal,
        previousYearRevenue: previousYearTotal,
        yoyGrowth,
        momGrowth,
      },
    });
  } catch (error) {
    console.error('Error fetching royalty history:', error);
    return NextResponse.json({ error: 'Failed to fetch royalty history' }, { status: 500 });
  }
}
