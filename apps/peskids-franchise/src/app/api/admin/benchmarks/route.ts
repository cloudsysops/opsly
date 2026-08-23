import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    // Get the benchmark for this month
    let benchmark = await prisma.financialBenchmark.findUnique({
      where: { year_month: { year, month } },
    });

    // Get all franchisee snapshots for this month
    const snapshots = await prisma.tutorCruncherSnapshot.findMany({
      where: { year, month },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { grossRevenue: "desc" },
    });

    // If no benchmark exists but we have data, calculate it on the fly
    if (!benchmark && snapshots.length > 0) {
      const revenues = snapshots.map((s) => Number(s.grossRevenue)).sort((a, b) => a - b);
      const median = getMedian(revenues);
      const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      const topQuartile = getPercentile(revenues, 75);
      const bottomQuartile = getPercentile(revenues, 25);

      benchmark = {
        id: "calculated",
        year,
        month,
        networkMedianRevenue: { toNumber: () => median } as any,
        networkAvgRevenue: { toNumber: () => avg } as any,
        networkTopQuartile: { toNumber: () => topQuartile } as any,
        networkBottomQuartile: { toNumber: () => bottomQuartile } as any,
        medianHomeRevenue: null,
        medianOnlineRevenue: null,
        medianRetailRevenue: null,
        medianSchoolRevenue: null,
        medianLessonsPerMonth: null,
        medianStudentsActive: null,
        medianTutorsActive: null,
        avgCustomerRetention: null,
        avgGrossMargin: null,
        avgCollectionRate: null,
        avgDaysToPayment: null,
        avgRevenueGrowthMoM: null,
        avgRevenueGrowthYoY: null,
        franchiseeCount: snapshots.length,
        createdAt: new Date(),
      } as any;
    }

    // Get previous month's snapshots for trend calculation
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevSnapshots = await prisma.tutorCruncherSnapshot.findMany({
      where: { year: prevYear, month: prevMonth },
    });
    const prevRevenueMap = new Map(
      prevSnapshots.map((s) => [s.franchiseeAccountId, Number(s.grossRevenue)])
    );

    // Calculate percentile for each franchisee
    const revenues = snapshots.map((s) => Number(s.grossRevenue)).sort((a, b) => a - b);
    const medianRevenue = benchmark ? Number(benchmark.networkMedianRevenue) : getMedian(revenues);

    const franchisees = snapshots.map((s) => {
      const revenue = Number(s.grossRevenue);
      const percentile = getPercentileRank(revenues, revenue);
      const prevRevenue = prevRevenueMap.get(s.franchiseeAccountId);

      let trend: "up" | "down" | "stable" = "stable";
      if (prevRevenue !== undefined) {
        const change = ((revenue - prevRevenue) / prevRevenue) * 100;
        if (change > 5) trend = "up";
        else if (change < -5) trend = "down";
      }

      return {
        id: s.franchiseeAccountId,
        name: `${s.franchiseeAccount.prospect.firstName} ${s.franchiseeAccount.prospect.lastName}`,
        email: s.franchiseeAccount.prospect.email,
        revenue,
        percentile,
        vsMedian: medianRevenue > 0 ? ((revenue - medianRevenue) / medianRevenue) * 100 : 0,
        trend,
        homeRevenue: Number(s.homeRevenue || 0),
        onlineRevenue: Number(s.onlineRevenue || 0),
        retailRevenue: Number(s.retailRevenue || 0),
        schoolRevenue: Number(s.schoolRevenue || 0),
        lessonsDelivered: s.totalLessons || 0,
        activeStudents: s.activeStudents || 0,
      };
    });

    return NextResponse.json({ benchmark, franchisees });
  } catch (error) {
    console.error("Failed to fetch benchmarks:", error);
    return NextResponse.json({ error: "Failed to fetch benchmarks" }, { status: 500 });
  }
}

function getMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getPercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function getPercentileRank(sorted: number[], value: number): number {
  if (sorted.length === 0) return 0;
  let count = 0;
  for (const v of sorted) {
    if (v < value) count++;
  }
  return Math.round((count / sorted.length) * 100);
}
