import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchStateBoundary, fetchCountyBoundaries } from "@/lib/territories/boundaries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "state";
    const stateCode = searchParams.get("stateCode");

    if (!stateCode) {
      return NextResponse.json({ error: "stateCode is required" }, { status: 400 });
    }

    if (type === "state") {
      const boundary = await fetchStateBoundary(stateCode);
      if (!boundary) {
        return NextResponse.json({ error: "State boundary not found" }, { status: 404 });
      }
      return NextResponse.json({
        type: "FeatureCollection",
        features: [boundary],
      });
    }

    if (type === "county") {
      const boundaries = await fetchCountyBoundaries(stateCode);
      return NextResponse.json(boundaries);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Boundaries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch boundaries" },
      { status: 500 }
    );
  }
}
