import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "geojson";

    const territory = await db.market.findUnique({
      where: { id: params.id },
      include: {
        franchiseeAccount: {
          include: { prospect: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    if (format === "geojson") {
      const feature: GeoJSON.Feature = {
        type: "Feature",
        geometry: (territory.boundaryGeoJson as unknown as GeoJSON.Geometry) || {
          type: "Point",
          coordinates: [territory.centerLng || 0, territory.centerLat || 0],
        },
        properties: {
          id: territory.id,
          name: territory.name,
          state: territory.state,
          status: territory.status,
          population: territory.population,
          medianIncome: territory.medianIncome,
          children5to12: territory.children5to12,
          territoryScore: territory.territoryScore,
          competitorCount: territory.competitorCount,
          schoolCount: territory.schoolCount,
        },
      };

      return new NextResponse(JSON.stringify(feature, null, 2), {
        headers: {
          "Content-Type": "application/geo+json",
          "Content-Disposition": `attachment; filename="${territory.name.replace(/[^a-zA-Z0-9]/g, "_")}.geojson"`,
        },
      });
    }

    if (format === "csv") {
      const headers = [
        "Name", "State", "Status", "Population", "Median Income",
        "Median Age", "Children 5-12", "Households w/ Kids", "Total Households",
        "Schools", "Competitors", "Score", "Center Lat", "Center Lng",
        "Radius (mi)", "Franchisee",
      ];

      const franchisee = territory.franchiseeAccount
        ? `${territory.franchiseeAccount.prospect.firstName} ${territory.franchiseeAccount.prospect.lastName}`
        : "";

      const row = [
        territory.name,
        territory.state,
        territory.status,
        territory.population || "",
        territory.medianIncome || "",
        territory.medianAge || "",
        territory.children5to12 || "",
        territory.householdsWithChildren || "",
        territory.totalHouseholds || "",
        territory.schoolCount || "",
        territory.competitorCount || "",
        territory.territoryScore || "",
        territory.centerLat || "",
        territory.centerLng || "",
        territory.radiusMiles || "",
        franchisee,
      ];

      const csv = [headers.join(","), row.map((v) => `"${v}"`).join(",")].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${territory.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json(territory);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export territory" },
      { status: 500 }
    );
  }
}
