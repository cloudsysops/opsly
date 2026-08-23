import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateIsochrone, generateConcentricIsochrones } from "@/lib/territories/isochrone";
import * as turf from "@turf/turf";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { center, minutes, mode = "driving", intervals } = await request.json();

    if (!center || !Array.isArray(center) || center.length !== 2) {
      return NextResponse.json({ error: "center must be [lng, lat]" }, { status: 400 });
    }

    const typedCenter: [number, number] = [Number(center[0]), Number(center[1])];

    if (intervals && Array.isArray(intervals)) {
      const polygons = await generateConcentricIsochrones(typedCenter, intervals, mode);
      const areas = polygons.map((p) => turf.area(p) / 2589988.11);
      return NextResponse.json({ polygons, areas });
    }

    if (!minutes || minutes < 1 || minutes > 120) {
      return NextResponse.json({ error: "minutes must be 1-120" }, { status: 400 });
    }

    const polygon = await generateIsochrone(typedCenter, minutes, mode);
    const area = turf.area(polygon) / 2589988.11;

    return NextResponse.json({ polygon, area });
  } catch (error) {
    console.error("Isochrone error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate isochrone" },
      { status: 500 }
    );
  }
}
