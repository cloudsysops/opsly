import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/benchmarks - Get comprehensive benchmark data
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: {
          include: {
            tcSnapshots: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 24,
            },
            healthScores: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 2,
            },
          },
        },
      },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const account = prospect.franchiseeAccount;
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

    const previousMonth = month > 1 ? month - 1 : 12;
    const previousMonthYear = month > 1 ? year : year - 1;

    // ============================================
    // GET ALL FRANCHISEE DATA FOR COMPARISONS
    // ============================================
    const allFranchisees = await db.franchiseeAccount.findMany({
      include: {
        prospect: {
          select: { firstName: true, lastName: true, preferredTerritory: true },
        },
        tcSnapshots: {
          where: {
            OR: [
              { year, month },
              { year: previousMonthYear, month: previousMonth },
            ],
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        healthScores: {
          where: { year, month },
          take: 1,
        },
      },
    });

    // ============================================
    // CURRENT & PREVIOUS MONTH SNAPSHOTS
    // ============================================
    const mySnapshot = account.tcSnapshots.find(
      (s) => s.year === year && s.month === month
    );
    const myPreviousSnapshot = account.tcSnapshots.find(
      (s) => s.year === previousMonthYear && s.month === previousMonth
    );

    const myRevenue = mySnapshot ? Number(mySnapshot.grossRevenue) : 0;
    const myPreviousRevenue = myPreviousSnapshot ? Number(myPreviousSnapshot.grossRevenue) : 0;
    const myGrowthRate = myPreviousRevenue > 0
      ? ((myRevenue - myPreviousRevenue) / myPreviousRevenue) * 100
      : 0;

    // ============================================
    // NETWORK-WIDE CALCULATIONS
    // ============================================
    const currentMonthSnapshots = allFranchisees
      .map((f) => ({
        franchiseeId: f.id,
        snapshot: f.tcSnapshots.find((s) => s.year === year && s.month === month),
        prevSnapshot: f.tcSnapshots.find(
          (s) => s.year === previousMonthYear && s.month === previousMonth
        ),
        prospect: f.prospect,
      }))
      .filter((f) => f.snapshot);

    // Sort all by revenue for ranking
    const sortedByRevenue = [...currentMonthSnapshots].sort(
      (a, b) => Number(b.snapshot!.grossRevenue) - Number(a.snapshot!.grossRevenue)
    );

    const totalFranchisees = currentMonthSnapshots.length;
    const myCurrentRankIndex = sortedByRevenue.findIndex(
      (f) => f.franchiseeId === account.id
    );
    const myCurrentRank = myCurrentRankIndex >= 0 ? myCurrentRankIndex + 1 : totalFranchisees;

    // Previous month rankings for trend
    const prevMonthSnapshots = allFranchisees
      .map((f) => ({
        franchiseeId: f.id,
        snapshot: f.tcSnapshots.find(
          (s) => s.year === previousMonthYear && s.month === previousMonth
        ),
      }))
      .filter((f) => f.snapshot);

    const sortedPreviousByRevenue = [...prevMonthSnapshots].sort(
      (a, b) => Number(b.snapshot!.grossRevenue) - Number(a.snapshot!.grossRevenue)
    );
    const myPreviousRankIndex = sortedPreviousByRevenue.findIndex(
      (f) => f.franchiseeId === account.id
    );
    const myPreviousRank = myPreviousRankIndex >= 0 ? myPreviousRankIndex + 1 : totalFranchisees;

    // Percentile (top X%)
    const percentile = totalFranchisees > 0
      ? Math.round((myCurrentRank / totalFranchisees) * 100)
      : 50;

    // Network growth rates
    const growthRates = currentMonthSnapshots
      .map((f) => {
        const prevRev = f.prevSnapshot ? Number(f.prevSnapshot.grossRevenue) : 0;
        const curRev = Number(f.snapshot!.grossRevenue);
        return prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
      })
      .filter((g) => g !== 0);

    const networkAvgGrowth = growthRates.length > 0
      ? growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length
      : 0;

    // ============================================
    // HEALTH SCORE DATA
    // ============================================
    const myHealthScore = account.healthScores[0];
    const allHealthScores = allFranchisees
      .map((f) => f.healthScores[0])
      .filter(Boolean);

    const networkAvgHealth = {
      financial: allHealthScores.length > 0
        ? allHealthScores.reduce((sum, h) => sum + h.financialScore, 0) / allHealthScores.length
        : 50,
      operational: allHealthScores.length > 0
        ? allHealthScores.reduce((sum, h) => sum + h.operationalScore, 0) / allHealthScores.length
        : 50,
      compliance: allHealthScores.length > 0
        ? allHealthScores.reduce((sum, h) => sum + h.complianceScore, 0) / allHealthScores.length
        : 50,
      engagement: allHealthScores.length > 0
        ? allHealthScores.reduce((sum, h) => sum + h.engagementScore, 0) / allHealthScores.length
        : 50,
      growth: allHealthScores.length > 0
        ? allHealthScores.reduce((sum, h) => sum + h.growthScore, 0) / allHealthScores.length
        : 50,
      overall: allHealthScores.length > 0
        ? allHealthScores.reduce((sum, h) => sum + h.compositeScore, 0) / allHealthScores.length
        : 50,
    };

    // If no stored HealthScore, compute from dashboard logic
    const myHealthComponents = myHealthScore
      ? {
          financial: myHealthScore.financialScore,
          operational: myHealthScore.operationalScore,
          compliance: myHealthScore.complianceScore,
          engagement: myHealthScore.engagementScore,
          growth: myHealthScore.growthScore,
          overall: myHealthScore.compositeScore,
          riskLevel: myHealthScore.riskLevel,
        }
      : {
          financial: 65,
          operational: 60,
          compliance: 70,
          engagement: 55,
          growth: 50,
          overall: 62,
          riskLevel: 'MODERATE' as const,
        };

    // ============================================
    // REVENUE COMPARISON (Last 6 months)
    // ============================================
    const revenueComparison = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(year, month - 1 - i, 1);
      const cYear = monthDate.getFullYear();
      const cMonth = monthDate.getMonth() + 1;

      const mySnap = account.tcSnapshots.find(
        (s) => s.year === cYear && s.month === cMonth
      );

      // Gather all franchisee revenues for this month
      const allRevenues = allFranchisees
        .map((f) => {
          const snap = f.tcSnapshots.find(
            (s) => s.year === cYear && s.month === cMonth
          );
          return snap ? Number(snap.grossRevenue) : null;
        })
        .filter((r): r is number => r !== null);

      allRevenues.sort((a, b) => a - b);

      const median = allRevenues.length > 0
        ? allRevenues[Math.floor(allRevenues.length / 2)]
        : 0;
      const topPerformer = allRevenues.length > 0
        ? allRevenues[allRevenues.length - 1]
        : 0;

      revenueComparison.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: cYear,
        you: mySnap ? Number(mySnap.grossRevenue) : 0,
        networkMedian: Math.round(median),
        topPerformer: Math.round(topPerformer),
      });
    }

    // ============================================
    // CATEGORY BREAKDOWN
    // ============================================
    const myHome = mySnapshot ? Number(mySnapshot.homeRevenue || 0) : 0;
    const myOnline = mySnapshot ? Number(mySnapshot.onlineRevenue || 0) : 0;
    const myRetail = mySnapshot ? Number(mySnapshot.retailRevenue || 0) : 0;
    const mySchools = mySnapshot ? Number(mySnapshot.schoolRevenue || 0) : 0;
    const myTotal = myHome + myOnline + myRetail + mySchools;

    const networkCategories = {
      home: 0,
      online: 0,
      retail: 0,
      schools: 0,
    };
    let categoryCount = 0;

    currentMonthSnapshots.forEach((f) => {
      if (f.snapshot) {
        networkCategories.home += Number(f.snapshot.homeRevenue || 0);
        networkCategories.online += Number(f.snapshot.onlineRevenue || 0);
        networkCategories.retail += Number(f.snapshot.retailRevenue || 0);
        networkCategories.schools += Number(f.snapshot.schoolRevenue || 0);
        categoryCount++;
      }
    });

    if (categoryCount > 0) {
      networkCategories.home /= categoryCount;
      networkCategories.online /= categoryCount;
      networkCategories.retail /= categoryCount;
      networkCategories.schools /= categoryCount;
    }

    const categoryBreakdown = [
      {
        category: 'Home Lessons',
        you: myHome,
        networkAverage: Math.round(networkCategories.home),
        percentOfTotal: myTotal > 0 ? Math.round((myHome / myTotal) * 100) : 0,
      },
      {
        category: 'Online Lessons',
        you: myOnline,
        networkAverage: Math.round(networkCategories.online),
        percentOfTotal: myTotal > 0 ? Math.round((myOnline / myTotal) * 100) : 0,
      },
      {
        category: 'Retail/Club',
        you: myRetail,
        networkAverage: Math.round(networkCategories.retail),
        percentOfTotal: myTotal > 0 ? Math.round((myRetail / myTotal) * 100) : 0,
      },
      {
        category: 'School Programs',
        you: mySchools,
        networkAverage: Math.round(networkCategories.schools),
        percentOfTotal: myTotal > 0 ? Math.round((mySchools / myTotal) * 100) : 0,
      },
    ];

    // ============================================
    // LEADERBOARD (Anonymized)
    // ============================================
    const leaderboard = sortedByRevenue.map((f, index) => {
      const revenue = Number(f.snapshot!.grossRevenue);
      const prevRevenue = f.prevSnapshot ? Number(f.prevSnapshot.grossRevenue) : 0;
      const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      const isYou = f.franchiseeId === account.id;

      // Anonymize others: "Franchisee A", "Franchisee B", etc.
      const letterIndex = index;
      const anonymizedName = String.fromCharCode(65 + (letterIndex % 26));

      return {
        rank: index + 1,
        name: isYou
          ? `${prospect.firstName} ${prospect.lastName}`
          : `Franchisee ${anonymizedName}`,
        territory: isYou
          ? (prospect.preferredTerritory || 'Your Territory')
          : (f.prospect?.preferredTerritory || 'N/A'),
        revenue,
        lessons: f.snapshot!.totalLessons || 0,
        students: f.snapshot!.activeStudents || 0,
        growth: Math.round(growth * 10) / 10,
        isYou,
      };
    });

    // ============================================
    // GOAL TRACKING
    // ============================================
    // Calculate targets based on next percentile bracket
    const allRevenues = currentMonthSnapshots
      .map((f) => Number(f.snapshot!.grossRevenue))
      .sort((a, b) => a - b);

    const p75Revenue = allRevenues.length > 0
      ? allRevenues[Math.floor(allRevenues.length * 0.75)]
      : 10000;
    const p75Lessons = currentMonthSnapshots
      .map((f) => f.snapshot!.totalLessons || 0)
      .sort((a, b) => a - b);
    const p75LessonsValue = p75Lessons.length > 0
      ? p75Lessons[Math.floor(p75Lessons.length * 0.75)]
      : 100;
    const p75Students = currentMonthSnapshots
      .map((f) => f.snapshot!.activeStudents || 0)
      .sort((a, b) => a - b);
    const p75StudentsValue = p75Students.length > 0
      ? p75Students[Math.floor(p75Students.length * 0.75)]
      : 50;

    // Use the higher of p75 or sensible minimums
    const revenueTarget = Math.max(p75Revenue, 5000);
    const lessonsTarget = Math.max(p75LessonsValue, 50);
    const studentsTarget = Math.max(p75StudentsValue, 25);

    const myLessons = mySnapshot?.totalLessons || 0;
    const myStudents = mySnapshot?.activeStudents || 0;

    const goals = [
      {
        name: 'Revenue Goal',
        description: `Reach top 25% (${formatCurrencySimple(revenueTarget)}/month)`,
        current: myRevenue,
        target: revenueTarget,
        unit: 'currency',
        progress: Math.min(100, Math.round((myRevenue / revenueTarget) * 100)),
      },
      {
        name: 'Lessons Goal',
        description: `Deliver ${lessonsTarget}+ lessons/month`,
        current: myLessons,
        target: lessonsTarget,
        unit: 'number',
        progress: Math.min(100, Math.round((myLessons / lessonsTarget) * 100)),
      },
      {
        name: 'Students Goal',
        description: `Reach ${studentsTarget}+ active students`,
        current: myStudents,
        target: studentsTarget,
        unit: 'number',
        progress: Math.min(100, Math.round((myStudents / studentsTarget) * 100)),
      },
    ];

    // ============================================
    // RESPONSE
    // ============================================
    return NextResponse.json({
      period: { year, month },
      rank: {
        current: myCurrentRank,
        total: totalFranchisees,
        previousRank: myPreviousRank,
      },
      percentile,
      growthRate: Math.round(myGrowthRate * 10) / 10,
      networkAvgGrowth: Math.round(networkAvgGrowth * 10) / 10,
      healthScore: {
        ...myHealthComponents,
        networkAverage: networkAvgHealth,
      },
      revenueComparison,
      categoryBreakdown,
      leaderboard,
      goals,
    });
  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmark data' },
      { status: 500 }
    );
  }
}

function formatCurrencySimple(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
}
