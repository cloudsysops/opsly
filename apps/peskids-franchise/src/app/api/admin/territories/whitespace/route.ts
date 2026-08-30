import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as turf from "@turf/turf";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { state, bounds } = await request.json();

    // Get all territories in the state or within bounds
    const where: Record<string, unknown> = {};
    if (state) where.state = state;

    const territories = await db.market.findMany({
      where,
      select: {
        id: true,
        name: true,
        state: true,
        status: true,
        boundaryGeoJson: true,
        centerLat: true,
        centerLng: true,
        radiusMiles: true,
        territoryScore: true,
        population: true,
      },
    });

    // Find gaps between territories
    const suggestions: Array<{
      type: string;
      lat: number;
      lng: number;
      reason: string;
      nearestTerritory: string;
      distanceMiles: number;
    }> = [];

    // Check coverage gaps - find areas between territory centers
    for (let i = 0; i < territories.length; i++) {
      for (let j = i + 1; j < territories.length; j++) {
        const t1 = territories[i];
        const t2 = territories[j];
        if (!t1.centerLat || !t1.centerLng || !t2.centerLat || !t2.centerLng) continue;

        const distance = turf.distance(
          [t1.centerLng, t1.centerLat],
          [t2.centerLng, t2.centerLat],
          { units: "miles" }
        );

        const r1 = t1.radiusMiles || 10;
        const r2 = t2.radiusMiles || 10;
        const gap = distance - r1 - r2;

        if (gap > 5 && gap < 50) {
          const midLat = (t1.centerLat + t2.centerLat) / 2;
          const midLng = (t1.centerLng + t2.centerLng) / 2;

          suggestions.push({
            type: "gap",
            lat: midLat,
            lng: midLng,
            reason: `${gap.toFixed(1)} mile gap between ${t1.name} and ${t2.name}`,
            nearestTerritory: t1.name,
            distanceMiles: gap,
          });
        }
      }
    }

    // Filter by bounds if provided
    let filtered = suggestions;
    if (bounds) {
      filtered = suggestions.filter(
        (s) =>
          s.lat >= bounds.south &&
          s.lat <= bounds.north &&
          s.lng >= bounds.west &&
          s.lng <= bounds.east
      );
    }

    // Sort by gap size (largest gaps = best opportunities)
    filtered.sort((a, b) => b.distanceMiles - a.distanceMiles);

    return NextResponse.json({
      suggestions: filtered.slice(0, 20),
      totalTerritories: territories.length,
      state: state || "all",
    });
  } catch (error) {
    console.error("Whitespace analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze whitespace" },
      { status: 500 }
    );
  }
}
