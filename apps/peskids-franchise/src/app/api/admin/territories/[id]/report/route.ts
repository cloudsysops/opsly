import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTerritoryReport } from "@/lib/territories/reports";
import { getAreaFromTerritory } from "@/lib/territories/scoring";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const territory = await db.market.findUnique({
      where: { id: params.id },
      include: {
        franchiseeAccount: {
          include: { prospect: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    const area = getAreaFromTerritory(territory);
    const report = generateTerritoryReport(territory, area);

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
