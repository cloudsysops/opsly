import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateScore, getScoringConfig, getAreaFromTerritory } from "@/lib/territories/scoring";

export const dynamic = "force-dynamic";

export async function POST(
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
    });

    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    const config = await getScoringConfig("US");
    const area = getAreaFromTerritory(territory);
    const result = calculateScore(territory, config, area);

    // Update territory score
    await db.market.update({
      where: { id: params.id },
      data: { territoryScore: result.score },
    });

    return NextResponse.json({
      score: result.score,
      tier: result.tier,
      tierColor: result.tierColor,
      factors: result.factors,
      areaSqMiles: area,
    });
  } catch (error) {
    console.error("Score calculation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate score" },
      { status: 500 }
    );
  }
}
