import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { batchGeocode } from "@/lib/territories/geocoder";

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

    const dataset = await db.dataset.findUnique({
      where: { id: params.id },
      include: {
        dataPoints: {
          where: { lat: null },
          take: 100,
        },
      },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const toGeocode = dataset.dataPoints.filter((dp) => dp.address && !dp.lat);

    if (toGeocode.length === 0) {
      return NextResponse.json({ message: "No points to geocode", geocoded: 0 });
    }

    const addresses = toGeocode.map((dp) => dp.address as string);
    const batchResult = await batchGeocode(addresses);

    let geocoded = 0;
    for (const result of batchResult.results) {
      const matchIdx = addresses.indexOf(result.address);
      if (matchIdx >= 0) {
        await db.dataPoint.update({
          where: { id: toGeocode[matchIdx].id },
          data: { lat: result.lat, lng: result.lng },
        });
        geocoded++;
      }
    }

    // Update geocoded count
    const totalGeocoded = await db.dataPoint.count({
      where: { datasetId: params.id, lat: { not: null } },
    });

    await db.dataset.update({
      where: { id: params.id },
      data: { geocodedCount: totalGeocoded },
    });

    return NextResponse.json({
      geocoded,
      totalGeocoded,
      remaining: dataset.dataPoints.length - geocoded,
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Geocoding failed" },
      { status: 500 }
    );
  }
}
