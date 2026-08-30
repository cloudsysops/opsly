import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const map = await db.territoryMap.findUnique({
      where: { shareToken: params.token },
    });

    if (!map || !map.isShared) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check expiry
    if (map.shareExpiry && new Date(map.shareExpiry) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 404 });
    }

    // Get territory IDs from layers
    const layers = map.layers as { territoryIds?: string[] } | null;
    const territoryIds = layers?.territoryIds || [];

    if (territoryIds.length === 0) {
      return NextResponse.json({ territories: [], map: { name: map.name } });
    }

    const territories = await db.market.findMany({
      where: { id: { in: territoryIds } },
      select: {
        id: true,
        name: true,
        state: true,
        status: true,
        boundaryGeoJson: true,
        centerLat: true,
        centerLng: true,
        radiusMiles: true,
        color: true,
        population: true,
        medianIncome: true,
        territoryScore: true,
      },
    });

    return NextResponse.json({
      territories,
      map: { name: map.name },
    });
  } catch (error) {
    console.error("Shared map error:", error);
    return NextResponse.json(
      { error: "Failed to load shared map" },
      { status: 500 }
    );
  }
}
