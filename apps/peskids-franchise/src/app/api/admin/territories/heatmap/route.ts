import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get("indicator") || "population";
    const _granularity = searchParams.get("granularity") || "zip";
    const _bounds = searchParams.get("bounds");

    // Return sample heatmap data structure
    // In production, this would query Census data for the viewport bounds
    const features: GeoJSON.Feature[] = [];

    return NextResponse.json({
      type: "FeatureCollection",
      features,
      metadata: {
        indicator,
        count: features.length,
      },
    });
  } catch (error) {
    console.error("Heatmap error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
