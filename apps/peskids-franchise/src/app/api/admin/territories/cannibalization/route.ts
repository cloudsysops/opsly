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

    const { territoryId, boundaryGeoJson, centerLat, centerLng, radiusMiles } =
      await request.json();

    // Build the candidate geometry
    let candidateFeature: GeoJSON.Feature | null = null;

    if (boundaryGeoJson) {
      const geo = boundaryGeoJson as GeoJSON.Geometry | GeoJSON.Feature;
      candidateFeature =
        "type" in geo && geo.type === "Feature"
          ? (geo as GeoJSON.Feature)
          : { type: "Feature", geometry: geo as GeoJSON.Geometry, properties: {} };
    } else if (centerLat && centerLng && radiusMiles) {
      candidateFeature = turf.circle([centerLng, centerLat], radiusMiles, {
        steps: 64,
        units: "miles",
      });
    }

    if (!candidateFeature) {
      return NextResponse.json(
        { error: "Provide boundaryGeoJson or centerLat/centerLng/radiusMiles" },
        { status: 400 }
      );
    }

    // Get all existing territories (except self)
    const where: Record<string, unknown> = {};
    if (territoryId) where.NOT = { id: territoryId };

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
      },
    });

    const overlaps: Array<{
      territoryId: string;
      territoryName: string;
      overlapAreaSqMiles: number;
      overlapPercentage: number;
      severity: "low" | "medium" | "high";
    }> = [];

    for (const territory of territories) {
      let existingFeature: GeoJSON.Feature | null = null;

      if (territory.boundaryGeoJson) {
        const geo = territory.boundaryGeoJson as unknown as GeoJSON.Geometry | GeoJSON.Feature;
        existingFeature =
          "type" in geo && geo.type === "Feature"
            ? (geo as GeoJSON.Feature)
            : { type: "Feature", geometry: geo as GeoJSON.Geometry, properties: {} };
      } else if (territory.centerLat && territory.centerLng && territory.radiusMiles) {
        existingFeature = turf.circle(
          [territory.centerLng, territory.centerLat],
          territory.radiusMiles,
          { steps: 64, units: "miles" }
        );
      }

      if (!existingFeature) continue;

      try {
        const intersection = turf.intersect(
          turf.featureCollection([
            candidateFeature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
            existingFeature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
          ])
        );

        if (intersection) {
          const overlapArea = turf.area(intersection) / 2589988.11;
          const candidateArea = turf.area(candidateFeature) / 2589988.11;
          const pct = candidateArea > 0 ? (overlapArea / candidateArea) * 100 : 0;

          let severity: "low" | "medium" | "high" = "low";
          if (pct > 25) severity = "high";
          else if (pct > 10) severity = "medium";

          overlaps.push({
            territoryId: territory.id,
            territoryName: territory.name,
            overlapAreaSqMiles: overlapArea,
            overlapPercentage: pct,
            severity,
          });
        }
      } catch {
        // Skip invalid geometries
      }
    }

    overlaps.sort((a, b) => b.overlapPercentage - a.overlapPercentage);

    return NextResponse.json({
      overlaps,
      hasOverlap: overlaps.length > 0,
      maxOverlap: overlaps.length > 0 ? overlaps[0].overlapPercentage : 0,
    });
  } catch (error) {
    console.error("Cannibalization check error:", error);
    return NextResponse.json(
      { error: "Failed to check cannibalization" },
      { status: 500 }
    );
  }
}
