import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/territories/available - Public endpoint for available territories
// No authentication required
export async function GET() {
  try {
    const territories = await db.market.findMany({
      where: {
        status: {
          in: ["AVAILABLE", "COMING_SOON"],
        },
      },
      select: {
        name: true,
        state: true,
        description: true,
        centerLat: true,
        centerLng: true,
        status: true,
      },
      orderBy: [{ state: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ territories });
  } catch (error) {
    console.error("Error fetching available territories:", error);
    return NextResponse.json(
      { error: "Failed to fetch territories" },
      { status: 500 }
    );
  }
}
