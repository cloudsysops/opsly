import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as turf from "@turf/turf";

export const dynamic = "force-dynamic";

// POST /api/admin/territories/overlap-check - Check if a polygon overlaps existing territories
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { geometry, excludeId } = await request.json();

    if (!geometry) {
      return NextResponse.json(
        { error: "GeoJSON geometry is required" },
        { status: 400 }
      );
    }

    // Parse the incoming geometry as a Feature
    const newFeature: GeoJSON.Feature<GeoJSON.Polygon> =
      geometry.type === "Feature"
        ? geometry
        : { type: "Feature", geometry, properties: {} };

    // Fetch all territories that have boundaries
    const territories = await db.market.findMany({
      where: {
        OR: [
          { boundaryGeoJson: { not: undefined } },
          {
            AND: [
              { centerLat: { not: null } },
              { centerLng: { not: null } },
              { radiusMiles: { not: null } },
            ],
          },
        ],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
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

    const overlaps: {
      territoryId: string;
      territoryName: string;
      territoryState: string;
      overlapAreaSqMiles: number;
      overlapPercentage: number;
    }[] = [];

    for (const territory of territories) {
      let existingGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null = null;

      if (territory.boundaryGeoJson) {
        const geo = territory.boundaryGeoJson as unknown as GeoJSON.Geometry | GeoJSON.Feature;
        if ("type" in geo) {
          existingGeometry =
            geo.type === "Feature"
              ? (geo as GeoJSON.Feature<GeoJSON.Polygon>)
              : {
                  type: "Feature",
                  geometry: geo as GeoJSON.Polygon,
                  properties: {},
                };
        }
      } else if (
        territory.centerLat != null &&
        territory.centerLng != null &&
        territory.radiusMiles != null
      ) {
        existingGeometry = turf.circle(
          [territory.centerLng, territory.centerLat],
          territory.radiusMiles,
          { steps: 64, units: "miles" }
        );
      }

      if (!existingGeometry) continue;

      try {
        const intersection = turf.intersect(
          turf.featureCollection([newFeature, existingGeometry])
        );

        if (intersection) {
          const overlapAreaSqMiles = turf.area(intersection) / 2589988.11;
          const newArea = turf.area(newFeature) / 2589988.11;
          const overlapPercentage = newArea > 0 ? (overlapAreaSqMiles / newArea) * 100 : 0;

          if (overlapAreaSqMiles > 0.01) {
            overlaps.push({
              territoryId: territory.id,
              territoryName: territory.name,
              territoryState: territory.state,
              overlapAreaSqMiles: Math.round(overlapAreaSqMiles * 100) / 100,
              overlapPercentage: Math.round(overlapPercentage * 10) / 10,
            });
          }
        }
      } catch {
        // Skip territories with invalid geometries
        continue;
      }
    }

    return NextResponse.json({
      hasOverlaps: overlaps.length > 0,
      overlaps,
    });
  } catch (error) {
    console.error("Overlap check error:", error);
    return NextResponse.json(
      { error: "Failed to check overlaps" },
      { status: 500 }
    );
  }
}
