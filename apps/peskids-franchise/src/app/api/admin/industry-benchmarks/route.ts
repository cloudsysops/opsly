import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompanyType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET all industry benchmarks
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const companyType = searchParams.get("companyType") as CompanyType | null;
    const year = searchParams.get("year");

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (companyType) where.companyType = companyType;
    if (year) where.dataYear = parseInt(year);

    const benchmarks = await db.industryBenchmark.findMany({
      where,
      orderBy: [{ companyType: "asc" }, { systemWideRevenue: "desc" }],
    });

    // Get growth milestones
    const milestones = await db.growthMilestone.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    // Get latest STC performance snapshot
    const latestSnapshot = await db.sTCPerformanceSnapshot.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Calculate current STC metrics from live data
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get active franchisees count
    const activeFranchisees = await db.franchiseeAccount.count({
      where: {
        prospect: { pipelineStage: "SELECTED" },
      },
    });

    // Get YTD revenue from snapshots
    const ytdSnapshots = await db.tutorCruncherSnapshot.findMany({
      where: { year: currentYear },
    });
    const ytdRevenue = ytdSnapshots.reduce(
      (sum, s) => sum + Number(s.grossRevenue || 0),
      0
    );
    const avgRevenuePerUnit =
      activeFranchisees > 0 ? ytdRevenue / activeFranchisees : 0;

    // Get unique states from franchisee territories
    const franchisees = await db.franchiseeAccount.findMany({
      where: { prospect: { pipelineStage: "SELECTED" } },
      include: { prospect: { select: { preferredTerritory: true } } },
    });
    const uniqueStates = new Set(
      franchisees
        .map((f) => f.prospect.preferredTerritory?.split(",")[0]?.trim())
        .filter(Boolean)
    );

    const currentSTCMetrics = {
      systemWideRevenue: ytdRevenue,
      avgRevenuePerUnit,
      activeFranchisees,
      statesOperating: uniqueStates.size,
      asOfDate: new Date().toISOString(),
    };

    // Staleness enrichment
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const enrichedBenchmarks = benchmarks.map((b) => ({
      ...b,
      isStale: b.dataYear < currentYear - 1 ||
        (b.lastVerifiedAt ? b.lastVerifiedAt < oneYearAgo : true),
    }));

    const staleBenchmarkCount = enrichedBenchmarks.filter(b => b.isStale).length;

    return NextResponse.json({
      benchmarks: enrichedBenchmarks,
      milestones,
      latestSnapshot,
      currentSTCMetrics,
      staleBenchmarkCount,
    });
  } catch (error) {
    console.error("Failed to fetch industry benchmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch benchmarks" },
      { status: 500 }
    );
  }
}

// POST create new benchmark
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const benchmark = await db.industryBenchmark.create({
      data: body,
    });

    return NextResponse.json({ benchmark });
  } catch (error) {
    console.error("Failed to create benchmark:", error);
    return NextResponse.json(
      { error: "Failed to create benchmark" },
      { status: 500 }
    );
  }
}
