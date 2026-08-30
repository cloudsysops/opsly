import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/admin/territories/geocode - Proxy Mapbox geocoding requests
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, limit = 5 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query string is required" },
        { status: 400 }
      );
    }

    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Mapbox token not configured" },
        { status: 500 }
      );
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${token}&country=US&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Geocoding request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      features: (data.features || []).map((f: {
        center: [number, number];
        place_name: string;
        bbox?: [number, number, number, number];
        text: string;
        place_type: string[];
      }) => ({
        center: f.center,
        placeName: f.place_name,
        bbox: f.bbox,
        text: f.text,
        placeType: f.place_type,
      })),
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json(
      { error: "Failed to geocode" },
      { status: 500 }
    );
  }
}
