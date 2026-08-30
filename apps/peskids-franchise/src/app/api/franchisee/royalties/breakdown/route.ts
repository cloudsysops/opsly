import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/royalties/breakdown - Get revenue breakdown by category
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
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;

    // Build query filter
    const where: Record<string, unknown> = { franchiseeAccountId, year };
    if (month) where.month = month;

    // Get snapshots for the period
    const snapshots = await db.tutorCruncherSnapshot.findMany({
      where,
      orderBy: [{ month: 'asc' }],
    });

    // Aggregate by category
    const breakdown = {
      home: 0,
      online: 0,
      retail: 0,
      schools: 0,
      other: 0,
    };

    const monthlyBreakdown: Array<{
      month: number;
      home: number;
      online: number;
      retail: number;
      schools: number;
      other: number;
      total: number;
    }> = [];

    snapshots.forEach((snapshot: any) => {
      const rawData = (snapshot.rawData as Record<string, unknown>) || {};
      const home = Number(rawData.homeRevenue || 0);
      const online = Number(rawData.onlineRevenue || 0);
      const retail = Number(rawData.retailRevenue || 0);
      const schools = Number(rawData.schoolRevenue || 0);
      const other = Number(rawData.otherRevenue || 0);

      breakdown.home += home;
      breakdown.online += online;
      breakdown.retail += retail;
      breakdown.schools += schools;
      breakdown.other += other;

      monthlyBreakdown.push({
        month: snapshot.month,
        home,
        online,
        retail,
        schools,
        other,
        total: home + online + retail + schools + other,
      });
    });

    const total = breakdown.home + breakdown.online + breakdown.retail + breakdown.schools + breakdown.other;

    return NextResponse.json({
      year,
      month: month || null,
      breakdown,
      total,
      percentages: {
        home: total > 0 ? (breakdown.home / total) * 100 : 0,
        online: total > 0 ? (breakdown.online / total) * 100 : 0,
        retail: total > 0 ? (breakdown.retail / total) * 100 : 0,
        schools: total > 0 ? (breakdown.schools / total) * 100 : 0,
        other: total > 0 ? (breakdown.other / total) * 100 : 0,
      },
      monthlyBreakdown,
    });
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue breakdown' }, { status: 500 });
  }
}
