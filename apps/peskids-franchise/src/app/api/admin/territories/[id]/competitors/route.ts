import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchPOI, searchCustom } from "@/lib/territories/overpass";
import * as turf from "@turf/turf";

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

    // Return cached competitor searches for this territory
    const searches = await db.pOISearch.findMany({
      where: { marketId: params.id, category: "competitors" },
      orderBy: { searchedAt: "desc" },
      take: 5,
    });

    return NextResponse.json(searches);
  } catch (error) {
    console.error("Competitors fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

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

    const { category = "competitors", keyword } = await request.json();

    // Calculate bounds from territory geometry or center/radius
    let bounds;
    if (territory.boundaryGeoJson) {
      const geo = territory.boundaryGeoJson as unknown as GeoJSON.Feature | GeoJSON.Geometry;
      const feature = "type" in geo && geo.type === "Feature"
        ? geo as GeoJSON.Feature
        : { type: "Feature" as const, geometry: geo as GeoJSON.Geometry, properties: {} };
      const bbox = turf.bbox(feature);
      bounds = { south: bbox[1], west: bbox[0], north: bbox[3], east: bbox[2] };
    } else if (territory.centerLat && territory.centerLng) {
      const radius = territory.radiusMiles || 10;
      const center = turf.point([territory.centerLng, territory.centerLat]);
      const buffered = turf.buffer(center, radius, { units: "miles" });
      if (buffered) {
        const bbox = turf.bbox(buffered);
        bounds = { south: bbox[1], west: bbox[0], north: bbox[3], east: bbox[2] };
      }
    }

    if (!bounds) {
      return NextResponse.json({ error: "Territory has no geometry" }, { status: 400 });
    }

    let results;
    if (keyword) {
      results = await searchCustom(bounds, keyword);
    } else {
      results = await searchPOI(bounds, category);
    }

    // Save the search results
    const search = await db.pOISearch.create({
      data: {
        marketId: params.id,
        query: keyword || category,
        category,
        bounds: JSON.parse(JSON.stringify(bounds)),
        results: JSON.parse(JSON.stringify(results)),
        resultCount: results.length,
      },
    });

    // Update competitor count on territory if searching competitors
    if (category === "competitors") {
      await db.market.update({
        where: { id: params.id },
        data: { competitorCount: results.length },
      });
    } else if (category === "schools") {
      await db.market.update({
        where: { id: params.id },
        data: { schoolCount: results.length },
      });
    }

    return NextResponse.json({
      search,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Competitor search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search competitors" },
      { status: 500 }
    );
  }
}
