import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// POST /api/franchisee/reports/generate - Generate report data for a given type and date range
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { reportType, startYear, startMonth, endYear, endMonth } = body;

    if (!reportType || !startYear || !startMonth || !endYear || !endMonth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (reportType === 'performance') {
      return generatePerformanceReport(franchiseeAccountId, startYear, startMonth, endYear, endMonth);
    }

    // All other report types use TutorCruncherSnapshot data
    return generateSnapshotReport(franchiseeAccountId, reportType, startYear, startMonth, endYear, endMonth);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function generateSnapshotReport(
  franchiseeAccountId: string,
  reportType: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  // Build date range query: we need snapshots where (year, month) is between start and end
  const snapshots = await db.tutorCruncherSnapshot.findMany({
    where: {
      franchiseeAccountId,
      OR: buildDateRangeFilter(startYear, startMonth, endYear, endMonth),
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  const months = snapshots.map((snapshot: any) => {
    const rawData = (snapshot.rawData as Record<string, unknown>) || {};
    const grossRevenue = Number(snapshot.grossRevenue) || 0;
    const homeRevenue = Number(rawData.homeRevenue || snapshot.homeRevenue || 0);
    const onlineRevenue = Number(rawData.onlineRevenue || snapshot.onlineRevenue || 0);
    const retailRevenue = Number(rawData.retailRevenue || snapshot.retailRevenue || 0);
    const schoolRevenue = Number(rawData.schoolRevenue || snapshot.schoolRevenue || 0);
    const otherRevenue = Number(rawData.otherRevenue || snapshot.otherRevenue || 0);
    const totalLessons = Number(snapshot.totalLessons || 0);
    const activeStudents = Number(snapshot.activeStudents || 0);
    const activeTutors = Number(snapshot.activeTutors || 0);
    const totalHours = Number(snapshot.totalHours || 0);
    const tutorPay = Number(rawData.tutorPay || 0);
    const adHocPay = Number(rawData.adHocPay || 0);
    const grossProfit = grossRevenue - tutorPay - adHocPay;
    const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    const base = {
      year: snapshot.year,
      month: snapshot.month,
      label: `${MONTHS[snapshot.month - 1]} ${snapshot.year}`,
    };

    switch (reportType) {
      case 'revenue':
        return {
          ...base,
          grossRevenue,
          homeRevenue,
          onlineRevenue,
          retailRevenue,
          schoolRevenue,
          otherRevenue,
        };
      case 'lessons':
        return {
          ...base,
          totalLessons,
          activeStudents,
          activeTutors,
          totalHours,
        };
      case 'students':
        return {
          ...base,
          activeStudents,
          totalLessons,
          lessonsPerStudent: activeStudents > 0 ? Math.round(totalLessons / activeStudents * 10) / 10 : 0,
        };
      case 'tutors':
        return {
          ...base,
          activeTutors,
          totalLessons,
          totalHours,
          lessonsPerTutor: activeTutors > 0 ? Math.round(totalLessons / activeTutors * 10) / 10 : 0,
          hoursPerTutor: activeTutors > 0 ? Math.round(totalHours / activeTutors * 10) / 10 : 0,
        };
      case 'financial':
        return {
          ...base,
          grossRevenue,
          tutorPay,
          adHocPay,
          totalCOGS: tutorPay + adHocPay,
          grossProfit,
          profitMargin: Math.round(profitMargin * 10) / 10,
        };
      default:
        return {
          ...base,
          grossRevenue,
        };
    }
  });

  // Calculate totals and averages
  const totals: Record<string, number> = {};
  const averages: Record<string, number> = {};

  if (months.length > 0) {
    const numericKeys = Object.keys(months[0]).filter(
      (k) => k !== 'year' && k !== 'month' && k !== 'label'
    );

    numericKeys.forEach((key) => {
      const sum = months.reduce((acc: number, m: any) => acc + (Number(m[key]) || 0), 0);
      totals[key] = Math.round(sum * 100) / 100;
      averages[key] = Math.round((sum / months.length) * 100) / 100;
    });

    // Fix percentage averages - recalculate rather than averaging
    if (reportType === 'financial' && totals.grossRevenue > 0) {
      averages.profitMargin = Math.round((totals.grossProfit / totals.grossRevenue) * 100 * 10) / 10;
      totals.profitMargin = averages.profitMargin;
    }
    if (reportType === 'students' && totals.activeStudents > 0) {
      averages.lessonsPerStudent = Math.round((totals.totalLessons / totals.activeStudents) * 10) / 10;
      totals.lessonsPerStudent = averages.lessonsPerStudent;
    }
    if (reportType === 'tutors' && totals.activeTutors > 0) {
      averages.lessonsPerTutor = Math.round((totals.totalLessons / totals.activeTutors) * 10) / 10;
      averages.hoursPerTutor = Math.round((totals.totalHours / totals.activeTutors) * 10) / 10;
      totals.lessonsPerTutor = averages.lessonsPerTutor;
      totals.hoursPerTutor = averages.hoursPerTutor;
    }
  }

  return NextResponse.json({ months, totals, averages, reportType });
}

async function generatePerformanceReport(
  franchiseeAccountId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  const healthScores = await db.healthScore.findMany({
    where: {
      franchiseeAccountId,
      OR: buildDateRangeFilter(startYear, startMonth, endYear, endMonth),
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  const months = healthScores.map((score: any) => ({
    year: score.year,
    month: score.month,
    label: `${MONTHS[score.month - 1]} ${score.year}`,
    overallScore: Number(score.compositeScore) || 0,
    financialScore: Number(score.financialScore) || 0,
    operationalScore: Number(score.operationalScore) || 0,
    complianceScore: Number(score.complianceScore) || 0,
    engagementScore: Number(score.engagementScore) || 0,
    growthScore: Number(score.growthScore) || 0,
  }));

  const totals: Record<string, number> = {};
  const averages: Record<string, number> = {};

  if (months.length > 0) {
    const numericKeys = ['overallScore', 'financialScore', 'operationalScore', 'complianceScore', 'engagementScore', 'growthScore'];
    numericKeys.forEach((key) => {
      const sum = months.reduce((acc: number, m: any) => acc + (Number(m[key]) || 0), 0);
      totals[key] = Math.round(sum * 100) / 100;
      averages[key] = Math.round((sum / months.length) * 10) / 10;
    });
  }

  return NextResponse.json({ months, totals, averages, reportType: 'performance' });
}

function buildDateRangeFilter(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  // Handle same year
  if (startYear === endYear) {
    return [{ year: startYear, month: { gte: startMonth, lte: endMonth } }];
  }

  // Handle multi-year range
  const filters: any[] = [];

  // First year: startMonth to December
  filters.push({ year: startYear, month: { gte: startMonth } });

  // Middle years: all months
  for (let y = startYear + 1; y < endYear; y++) {
    filters.push({ year: y });
  }

  // Last year: January to endMonth
  filters.push({ year: endYear, month: { lte: endMonth } });

  return filters;
}
