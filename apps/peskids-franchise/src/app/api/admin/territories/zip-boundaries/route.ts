import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mergeZipBoundaries } from "@/lib/territories/boundaries";
import * as turf from "@turf/turf";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { zipCodes } = await request.json();

    if (!zipCodes || !Array.isArray(zipCodes) || zipCodes.length === 0) {
      return NextResponse.json({ error: "zipCodes array is required" }, { status: 400 });
    }

    const boundary = await mergeZipBoundaries(zipCodes);

    if (!boundary) {
      return NextResponse.json({ error: "Failed to generate boundary" }, { status: 404 });
    }

    const area = turf.area(boundary) / 2589988.11;

    return NextResponse.json({ boundary, area });
  } catch (error) {
    console.error("ZIP boundaries error:", error);
    return NextResponse.json(
      { error: "Failed to merge ZIP boundaries" },
      { status: 500 }
    );
  }
}
