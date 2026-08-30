import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/royalties/franchisee/[franchiseeId] - Get franchisee detail
export async function GET(
  request: NextRequest,
  { params }: { params: { franchiseeId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { franchiseeId } = params;

    const account = await db.franchiseeAccount.findUnique({
      where: { id: franchiseeId },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            preferredTerritory: true,
            pipelineStage: true,
          },
        },
        invoices: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 24, // Last 2 years
        },
        tcSnapshots: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12, // Last year
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Franchisee not found' }, { status: 404 });
    }

    // Check if TC is connected (has token) or STC database is used (Westside/Eastside)
    const territory = account.prospect.preferredTerritory?.toLowerCase() || '';
    const isSTCTerritory = territory.includes('westside') || territory.includes('eastside');
    const tutorCruncherConnected = !!(account.tutorCruncherBase && account.tutorCruncherToken) || isSTCTerritory;

    return NextResponse.json({
      id: account.id,
      prospectId: account.prospectId,
      name: `${account.prospect.firstName} ${account.prospect.lastName}`,
      email: account.prospect.email,
      phone: account.prospect.phone,
      territory: account.prospect.preferredTerritory,
      selectedAt: account.createdAt,
      currentMonthRevenue: account.currentMonthRevenue ? Number(account.currentMonthRevenue) : null,
      ytdRevenue: account.ytdRevenue ? Number(account.ytdRevenue) : null,
      stripeOnboarded: account.stripeOnboarded,
      stripeAccountId: account.stripeAccountId,
      tutorCruncherConnected,
      lastSyncAt: account.lastSyncAt,
      invoices: account.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        year: inv.year,
        month: inv.month,
        grossRevenue: Number(inv.grossRevenue),
        royaltyAmount: Number(inv.royaltyAmount),
        brandFundAmount: Number(inv.brandFundAmount),
        systemsFeeAmount: Number(inv.systemsFeeAmount),
        totalAmount: Number(inv.totalAmount),
        status: inv.status,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
      })),
      snapshots: account.tcSnapshots.map((snap) => ({
        year: snap.year,
        month: snap.month,
        grossRevenue: Number(snap.grossRevenue),
        totalLessons: snap.totalLessons || 0,
        totalHours: Number(snap.totalHours || 0),
        activeStudents: snap.activeStudents || 0,
        homeRevenue: Number(snap.homeRevenue || 0),
        onlineRevenue: Number(snap.onlineRevenue || 0),
        retailRevenue: Number(snap.retailRevenue || 0),
        schoolRevenue: Number(snap.schoolRevenue || 0),
        otherRevenue: Number(snap.otherRevenue || 0),
      })),
    });
  } catch (error) {
    console.error('Error fetching franchisee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch franchisee data' },
      { status: 500 }
    );
  }
}
