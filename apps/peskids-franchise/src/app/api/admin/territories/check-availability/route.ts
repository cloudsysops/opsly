import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Haversine formula: calculate distance in miles between two lat/lng points
function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/admin/territories/check-availability - Check if a point falls within available territories
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lat, lng } = body;

    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: "lat and lng are required" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "lat and lng must be valid numbers" },
        { status: 400 }
      );
    }

    // Get all territories that have center coordinates and a radius
    const territories = await db.market.findMany({
      where: {
        status: "AVAILABLE",
        centerLat: { not: null },
        centerLng: { not: null },
        radiusMiles: { not: null },
      },
      select: {
        id: true,
        name: true,
        state: true,
        description: true,
        status: true,
        centerLat: true,
        centerLng: true,
        radiusMiles: true,
      },
    });

    // Filter territories where the point falls within the radius
    const matching = territories.filter((t) => {
      const distance = haversineDistanceMiles(
        latitude,
        longitude,
        t.centerLat!,
        t.centerLng!
      );
      return distance <= t.radiusMiles!;
    });

    // Add distance info to each match
    const results = matching.map((t) => ({
      ...t,
      distanceMiles: parseFloat(
        haversineDistanceMiles(
          latitude,
          longitude,
          t.centerLat!,
          t.centerLng!
        ).toFixed(2)
      ),
    }));

    // Sort by closest first
    results.sort((a, b) => a.distanceMiles - b.distanceMiles);

    return NextResponse.json({
      available: results.length > 0,
      territories: results,
    });
  } catch (error) {
    console.error("Error checking territory availability:", error);
    return NextResponse.json(
      { error: "Failed to check territory availability" },
      { status: 500 }
    );
  }
}
