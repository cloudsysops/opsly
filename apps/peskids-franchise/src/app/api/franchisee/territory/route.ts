import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find franchisee account for this user
    const prospect = await db.prospect.findFirst({
      where: { email: session.user.email || "" },
      include: {
        franchiseeAccount: {
          include: {
            markets: true,
          },
        },
      },
    });

    const territory = prospect?.franchiseeAccount?.markets?.[0];
    if (!territory) {
      return NextResponse.json({ error: "No territory assigned" }, { status: 404 });
    }

    return NextResponse.json({
      id: territory.id,
      name: territory.name,
      state: territory.state,
      status: territory.status,
      boundaryGeoJson: territory.boundaryGeoJson,
      centerLat: territory.centerLat,
      centerLng: territory.centerLng,
      radiusMiles: territory.radiusMiles,
      population: territory.population,
      medianIncome: territory.medianIncome,
      children5to12: territory.children5to12,
      territoryScore: territory.territoryScore,
      color: territory.color,
    });
  } catch (error) {
    console.error("Franchisee territory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch territory" },
      { status: 500 }
    );
  }
}
