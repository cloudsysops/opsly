import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// Helper to calculate health score
function calculateHealthScore(data: {
  financialScore: number;
  operationalScore: number;
  complianceScore: number;
  engagementScore: number;
  growthScore: number;
}) {
  // Weights: Financial 30%, Operational 25%, Compliance 20%, Engagement 15%, Growth 10%
  return Math.round(
    data.financialScore * 0.3 +
      data.operationalScore * 0.25 +
      data.complianceScore * 0.2 +
      data.engagementScore * 0.15 +
      data.growthScore * 0.1
  );
}

// GET /api/franchisee/dashboard - Get franchisee dashboard data
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prospect with franchisee account
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: {
          include: {
            tcSnapshots: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 24, // Last 2 years
            },
            invoices: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
            },
            certifications: {
              include: {
                certification: true,
              },
              where: {
                OR: [
                  { status: 'ACTIVE' },
                  { status: 'EXPIRING_SOON' },
                ],
              },
            },
          },
        },
        academyProgress: {
          where: {
            completedAt: null,
          },
        },
      },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json(
        { error: 'Not a selected franchisee' },
        { status: 403 }
      );
    }

    const account = prospect.franchiseeAccount;
    if (!account) {
      return NextResponse.json(
        { error: 'Franchisee account not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const previousMonth = currentMonth > 1 ? currentMonth - 1 : 12;
    const previousMonthYear = currentMonth > 1 ? currentYear : currentYear - 1;

    // Current month snapshot
    const currentMonthSnapshot = account.tcSnapshots.find(
      (s) => s.year === currentYear && s.month === currentMonth
    );

    // Previous month for growth calculation
    const previousMonthSnapshot = account.tcSnapshots.find(
      (s) => s.year === previousMonthYear && s.month === previousMonth
    );

    // Calculate current month metrics
    const currentMonthRevenue = currentMonthSnapshot
      ? Number(currentMonthSnapshot.grossRevenue)
      : 0;
    const previousMonthRevenue = previousMonthSnapshot
      ? Number(previousMonthSnapshot.grossRevenue)
      : 0;

    // Calculate growth
    const growth =
      previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

    // YTD calculations
    const ytdSnapshots = account.tcSnapshots.filter((s) => s.year === currentYear);
    const ytdRevenue = ytdSnapshots.reduce((sum, s) => sum + Number(s.grossRevenue), 0);
    const ytdLessons = ytdSnapshots.reduce((sum, s) => sum + (s.totalLessons || 0), 0);

    // Invoice calculations
    const ytdInvoices = account.invoices.filter((i) => i.year === currentYear);
    const royaltiesPaid = ytdInvoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const royaltiesOutstanding = ytdInvoices
      .filter((i) => !['PAID', 'DRAFT', 'CANCELLED'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.totalAmount), 0);

    // Pending invoices count
    const pendingInvoices = ytdInvoices.filter(
      (i) => i.status === 'PENDING_REVIEW'
    ).length;

    // Pending journey tasks
    const pendingTasks = prospect.academyProgress.length;

    // Upcoming certifications
    const upcomingCertifications = account.certifications
      .filter((c) => c.expiresAt && c.status === 'EXPIRING_SOON')
      .map((c) => {
        const daysUntil = Math.ceil(
          (c.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          name: c.certification.name,
          expiresAt: c.expiresAt!.toISOString(),
          daysUntil,
        };
      })
      .filter((c) => c.daysUntil <= 30 && c.daysUntil > 0);

    // Calculate months active
    const selectedAt = prospect.selectedAt || new Date();
    const monthsActive = Math.max(
      1,
      (now.getFullYear() - selectedAt.getFullYear()) * 12 +
        now.getMonth() -
        selectedAt.getMonth()
    );

    // Get network averages for benchmarking
    const allFranchisees = await db.franchiseeAccount.findMany({
      include: {
        tcSnapshots: {
          where: {
            year: currentYear,
            month: currentMonth,
          },
        },
      },
    });

    // Calculate network averages
    const networkSnapshots = allFranchisees
      .map((f) => f.tcSnapshots[0])
      .filter(Boolean);

    const networkAverageRevenue =
      networkSnapshots.length > 0
        ? networkSnapshots.reduce((sum, s) => sum + Number(s.grossRevenue), 0) /
          networkSnapshots.length
        : 0;
    const networkAverageStudents =
      networkSnapshots.length > 0
        ? networkSnapshots.reduce((sum, s) => sum + (s.activeStudents || 0), 0) /
          networkSnapshots.length
        : 0;
    const networkAverageLessons =
      networkSnapshots.length > 0
        ? networkSnapshots.reduce((sum, s) => sum + (s.totalLessons || 0), 0) /
          networkSnapshots.length
        : 0;

    // Calculate percentile (based on revenue)
    const sortedByRevenue = [...networkSnapshots].sort(
      (a, b) => Number(a.grossRevenue) - Number(b.grossRevenue)
    );
    const myRank = sortedByRevenue.findIndex(
      (s) => s.franchiseeAccountId === account.id
    );
    const percentile =
      networkSnapshots.length > 0
        ? Math.round(((myRank + 1) / networkSnapshots.length) * 100)
        : 50;

    // ============================================
    // MONTHLY TRENDS (last 6 months)
    // ============================================
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const trendYear = monthDate.getFullYear();
      const trendMonth = monthDate.getMonth() + 1;
      const snapshot = account.tcSnapshots.find(
        (s) => s.year === trendYear && s.month === trendMonth
      );

      // Get network average for that month
      const monthNetworkSnapshots = allFranchisees
        .map((f) =>
          f.tcSnapshots.find((s) => s.year === trendYear && s.month === trendMonth)
        )
        .filter(Boolean);
      const monthNetworkAvg =
        monthNetworkSnapshots.length > 0
          ? monthNetworkSnapshots.reduce((sum, s) => sum + Number(s!.grossRevenue), 0) /
            monthNetworkSnapshots.length
          : 0;

      monthlyTrends.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        revenue: snapshot ? Number(snapshot.grossRevenue) : 0,
        networkAverage: monthNetworkAvg,
        lessons: snapshot?.totalLessons || 0,
        students: snapshot?.activeStudents || 0,
      });
    }

    // ============================================
    // HEALTH SCORE CALCULATION
    // ============================================

    // Financial Score (30% weight): Based on revenue vs network average and royalty compliance
    const revenueRatio = networkAverageRevenue > 0 ? currentMonthRevenue / networkAverageRevenue : 1;
    const royaltyCompliance =
      royaltiesOutstanding === 0 ? 100 : Math.max(0, 100 - (royaltiesOutstanding / (royaltiesPaid + royaltiesOutstanding)) * 100);
    const financialScore = Math.min(100, Math.round(revenueRatio * 50 + royaltyCompliance * 0.5));

    // Operational Score (25% weight): Based on lessons delivered and student retention
    const lessonsRatio = networkAverageLessons > 0 ? (currentMonthSnapshot?.totalLessons || 0) / networkAverageLessons : 1;
    const operationalScore = Math.min(100, Math.round(lessonsRatio * 100));

    // Compliance Score (20% weight): Based on active certifications
    const activeCerts = account.certifications.filter((c) => c.status === 'ACTIVE').length;
    const totalCertsRequired = await db.certification.count({ where: { requiredForLaunch: true } });
    const complianceScore = totalCertsRequired > 0 ? Math.round((activeCerts / totalCertsRequired) * 100) : 100;

    // Engagement Score (15% weight): Based on academy progress and journey completion
    const academyModules = await db.academyModule.count();
    const completedAcademyModules = await db.academyProgress.count({
      where: {
        prospectId: prospect.id,
        status: 'COMPLETED',
      },
    });
    const engagementScore = academyModules > 0 ? Math.round((completedAcademyModules / academyModules) * 100) : 50;

    // Growth Score (10% weight): Based on MoM growth
    const growthScore = Math.min(100, Math.max(0, Math.round(50 + growth))); // 50 is neutral, + for growth, - for decline

    const healthScore = calculateHealthScore({
      financialScore,
      operationalScore,
      complianceScore,
      engagementScore,
      growthScore,
    });

    const healthFactors = [
      {
        name: 'Financial',
        score: financialScore,
        maxScore: 100,
        weight: 30,
        color: '#059669',
        description: 'Revenue performance & royalty compliance',
      },
      {
        name: 'Operational',
        score: operationalScore,
        maxScore: 100,
        weight: 25,
        color: '#0891b2',
        description: 'Lessons delivered & operational efficiency',
      },
      {
        name: 'Compliance',
        score: complianceScore,
        maxScore: 100,
        weight: 20,
        color: '#6A469D',
        description: 'Certifications & requirements completion',
      },
      {
        name: 'Engagement',
        score: engagementScore,
        maxScore: 100,
        weight: 15,
        color: '#d97706',
        description: 'Training & journey progress',
      },
      {
        name: 'Growth',
        score: growthScore,
        maxScore: 100,
        weight: 10,
        color: '#34B256',
        description: 'Month-over-month performance improvement',
      },
    ];

    // ============================================
    // LEADERBOARD DATA
    // ============================================
    const leaderboardData = await Promise.all(
      allFranchisees.map(async (f) => {
        const fProspect = await db.prospect.findFirst({
          where: { franchiseeAccount: { id: f.id } },
          select: { firstName: true, lastName: true, preferredTerritory: true },
        });

        const currentSnapshot = f.tcSnapshots.find(
          (s) => s.year === currentYear && s.month === currentMonth
        );
        const prevSnapshot = f.tcSnapshots.find(
          (s) => s.year === previousMonthYear && s.month === previousMonth
        );

        const fRevenue = currentSnapshot ? Number(currentSnapshot.grossRevenue) : 0;
        const fPrevRevenue = prevSnapshot ? Number(prevSnapshot.grossRevenue) : 0;
        const fGrowth = fPrevRevenue > 0 ? ((fRevenue - fPrevRevenue) / fPrevRevenue) * 100 : 0;

        return {
          id: f.id,
          name: fProspect ? `${fProspect.firstName} ${fProspect.lastName}` : 'Unknown',
          territory: fProspect?.preferredTerritory || 'Unknown',
          revenue: fRevenue,
          growth: fGrowth,
          lessons: currentSnapshot?.totalLessons || 0,
          isYou: f.id === account.id,
        };
      })
    );

    // Sort by revenue and add ranks
    const sortedLeaderboard = leaderboardData
      .sort((a, b) => b.revenue - a.revenue)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        previousRank: index + 1, // TODO: Store historical ranks
      }));

    return NextResponse.json({
      franchisee: {
        name: `${prospect.firstName} ${prospect.lastName}`,
        email: prospect.email,
        monthsActive,
        stripeOnboarded: account.stripeOnboarded,
      },
      insurance: {
        carrier: account.insuranceCarrier,
        policyNumber: account.insurancePolicyNumber,
        coverageType: account.insuranceCoverageType,
        effectiveDate: account.insuranceEffectiveDate?.toISOString() ?? null,
        expiryDate: account.insuranceExpiry?.toISOString() ?? null,
        coiUrl: account.insuranceCOIUrl,
      },
      currentMonth: {
        revenue: currentMonthRevenue,
        lessons: currentMonthSnapshot?.totalLessons || 0,
        students: currentMonthSnapshot?.activeStudents || 0,
        tutors: currentMonthSnapshot?.activeTutors || 0,
      },
      ytd: {
        revenue: ytdRevenue,
        lessons: ytdLessons,
        royaltiesPaid,
        royaltiesOutstanding,
      },
      growth,
      network: {
        averageRevenue: networkAverageRevenue,
        averageLessons: networkAverageLessons,
        averageStudents: networkAverageStudents,
        percentile,
      },
      pendingInvoices,
      pendingTasks,
      upcomingCertifications,
      // New premium dashboard fields
      healthScore: {
        overall: healthScore,
        factors: healthFactors,
        previousScore: healthScore - 2, // TODO: Calculate from previous month
      },
      monthlyTrends,
      leaderboard: sortedLeaderboard,
    });
  } catch (error) {
    console.error('Error fetching franchisee dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
