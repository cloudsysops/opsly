import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/franchisees/[id]/aggregate - Aggregated metrics across all territories
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get the franchisee account with territories and snapshots
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            markets: true,
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: "Franchisee not found" },
        { status: 404 }
      );
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 400 }
      );
    }

    const franchiseeAccountId = prospect.franchiseeAccount.id;

    // Get the latest month with data
    const latestSnapshot = await db.tutorCruncherSnapshot.findFirst({
      where: { franchiseeAccountId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    let aggregatedMetrics = {
      grossRevenue: 0,
      homeRevenue: 0,
      onlineRevenue: 0,
      retailRevenue: 0,
      schoolRevenue: 0,
      otherRevenue: 0,
      totalLessons: 0,
      totalHours: 0,
      activeStudents: 0,
      activeTutors: 0,
      latestMonth: null as { year: number; month: number } | null,
    };

    if (latestSnapshot) {
      // Get all snapshots for the latest month (there could be multiple if multi-territory)
      const latestMonthSnapshots = await db.tutorCruncherSnapshot.findMany({
        where: {
          franchiseeAccountId,
          year: latestSnapshot.year,
          month: latestSnapshot.month,
        },
      });

      aggregatedMetrics = latestMonthSnapshots.reduce(
        (acc, snapshot) => ({
          grossRevenue: acc.grossRevenue + Number(snapshot.grossRevenue),
          homeRevenue:
            acc.homeRevenue + Number(snapshot.homeRevenue || 0),
          onlineRevenue:
            acc.onlineRevenue + Number(snapshot.onlineRevenue || 0),
          retailRevenue:
            acc.retailRevenue + Number(snapshot.retailRevenue || 0),
          schoolRevenue:
            acc.schoolRevenue + Number(snapshot.schoolRevenue || 0),
          otherRevenue:
            acc.otherRevenue + Number(snapshot.otherRevenue || 0),
          totalLessons:
            acc.totalLessons + (snapshot.totalLessons || 0),
          totalHours:
            acc.totalHours + Number(snapshot.totalHours || 0),
          activeStudents:
            acc.activeStudents + (snapshot.activeStudents || 0),
          activeTutors:
            acc.activeTutors + (snapshot.activeTutors || 0),
          latestMonth: { year: latestSnapshot.year, month: latestSnapshot.month },
        }),
        aggregatedMetrics
      );

      aggregatedMetrics.latestMonth = {
        year: latestSnapshot.year,
        month: latestSnapshot.month,
      };
    }

    // Get YTD revenue
    const currentYear = new Date().getFullYear();
    const ytdSnapshots = await db.tutorCruncherSnapshot.findMany({
      where: {
        franchiseeAccountId,
        year: currentYear,
      },
    });

    const ytdRevenue = ytdSnapshots.reduce(
      (sum, s) => sum + Number(s.grossRevenue),
      0
    );

    return NextResponse.json({
      franchiseeAccountId,
      territories: prospect.franchiseeAccount.markets.map((m) => ({
        id: m.id,
        name: m.name,
        state: m.state,
        status: m.status,
      })),
      territoryCount: prospect.franchiseeAccount.markets.length,
      isMultiUnit: prospect.franchiseeAccount.isMultiUnit,
      operatorType: prospect.franchiseeAccount.operatorType,
      currentMonth: aggregatedMetrics,
      ytdRevenue,
    });
  } catch (error) {
    console.error("Error fetching aggregate metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch aggregate metrics" },
      { status: 500 }
    );
  }
}
