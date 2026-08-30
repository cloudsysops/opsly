import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchPOI, searchCustom, POI_CATEGORIES } from "@/lib/territories/overpass";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bounds, category, keyword } = await request.json();

    if (!bounds || !bounds.south || !bounds.west || !bounds.north || !bounds.east) {
      return NextResponse.json({ error: "Valid bounds object is required" }, { status: 400 });
    }

    let results;
    if (keyword) {
      results = await searchCustom(bounds, keyword);
    } else if (category && POI_CATEGORIES[category]) {
      results = await searchPOI(bounds, category);
    } else {
      return NextResponse.json(
        { error: "Either a valid category or keyword is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      results,
      count: results.length,
      category: category || "custom",
    });
  } catch (error) {
    console.error("POI search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search POI" },
      { status: 500 }
    );
  }
}
