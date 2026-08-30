import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// GET /api/admin/royalties - Get royalty dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;

    // Get all franchisee accounts with their data
    const franchisees = await db.franchiseeAccount.findMany({
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            preferredTerritory: true,
            selectedAt: true,
          },
        },
        invoices: {
          where: month
            ? { year, month }
            : { year },
          orderBy: { month: 'desc' },
        },
        tcSnapshots: {
          where: month
            ? { year, month }
            : { year },
          orderBy: { month: 'desc' },
        },
      },
    });

    // Get YTD snapshots for each franchisee (all months in the year)
    const ytdSnapshots = await db.tutorCruncherSnapshot.groupBy({
      by: ['franchiseeAccountId'],
      where: { year },
      _sum: { grossRevenue: true },
    });

    // Create a map for quick lookup
    const ytdRevenueMap = new Map(
      ytdSnapshots.map((s) => [s.franchiseeAccountId, Number(s._sum.grossRevenue || 0)])
    );

    // Calculate summary statistics
    const invoiceSummary = await db.royaltyInvoice.groupBy({
      by: ['status'],
      where: month ? { year, month } : { year },
      _count: true,
      _sum: { totalAmount: true },
    });

    const totalRevenue = await db.tutorCruncherSnapshot.aggregate({
      where: month ? { year, month } : { year },
      _sum: { grossRevenue: true },
    });

    const totalCollected = await db.royaltyPayment.aggregate({
      where: {
        status: 'SUCCEEDED',
        invoice: month ? { year, month } : { year },
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      franchisees: franchisees.map((f) => {
        // Calculate current month revenue from the latest snapshot
        const currentMonthSnapshot = f.tcSnapshots[0]; // Already sorted by month desc
        const currentMonthRevenue = currentMonthSnapshot ? Number(currentMonthSnapshot.grossRevenue) : null;

        // Get YTD revenue from the pre-calculated map
        const ytdRevenue = ytdRevenueMap.get(f.id) || null;

        return {
          id: f.id,
          prospectId: f.prospectId,
          name: `${f.prospect.firstName} ${f.prospect.lastName}`,
          email: f.prospect.email,
          territory: f.prospect.preferredTerritory,
          selectedAt: f.prospect.selectedAt,
          currentMonthRevenue,
          ytdRevenue,
          stripeOnboarded: f.stripeOnboarded,
          tutorCruncherConnected: !!f.tutorCruncherId,
          lastSyncAt: f.lastSyncAt,
          invoices: f.invoices.map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            month: i.month,
            year: i.year,
            grossRevenue: Number(i.grossRevenue),
            totalAmount: Number(i.totalAmount),
            status: i.status,
            dueDate: i.dueDate,
            paidAt: i.paidAt,
          })),
          snapshots: f.tcSnapshots.map((s) => ({
            month: s.month,
            year: s.year,
            grossRevenue: Number(s.grossRevenue),
            totalLessons: s.totalLessons,
            activeStudents: s.activeStudents,
            activeTutors: s.activeTutors,
          })),
        };
      }),
      summary: {
        totalFranchisees: franchisees.length,
        totalRevenue: Number(totalRevenue._sum.grossRevenue || 0),
        totalCollected: Number(totalCollected._sum.amount || 0),
        byStatus: invoiceSummary.map((s) => ({
          status: s.status,
          count: s._count,
          total: Number(s._sum.totalAmount || 0),
        })),
      },
      filters: { year, month },
    });
  } catch (error) {
    console.error('Error fetching royalty dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch royalty data' },
      { status: 500 }
    );
  }
}
