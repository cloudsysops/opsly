import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTerritoryReport, generateComparisonReport } from "@/lib/territories/reports";
import { getAreaFromTerritory } from "@/lib/territories/scoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { territoryIds } = await request.json();

    if (!territoryIds || !Array.isArray(territoryIds) || territoryIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 territory IDs are required" },
        { status: 400 }
      );
    }

    if (territoryIds.length > 6) {
      return NextResponse.json(
        { error: "Maximum 6 territories can be compared" },
        { status: 400 }
      );
    }

    const territories = await db.market.findMany({
      where: { id: { in: territoryIds } },
      include: {
        franchiseeAccount: {
          include: { prospect: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (territories.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid territories required" },
        { status: 404 }
      );
    }

    const reports = territories.map((t) => {
      const area = getAreaFromTerritory(t);
      return generateTerritoryReport(t, area);
    });

    const comparison = generateComparisonReport(reports);

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Comparison error:", error);
    return NextResponse.json(
      { error: "Failed to compare territories" },
      { status: 500 }
    );
  }
}
