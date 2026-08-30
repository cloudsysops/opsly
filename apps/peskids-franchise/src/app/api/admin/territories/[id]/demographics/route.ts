import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchDemographicsForGeography } from "@/lib/territories/census";

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

    const territory = await db.market.findUnique({
      where: { id: params.id },
    });

    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const stateCode = body.stateCode || territory.state || "TN";

    // Lookup state FIPS code
    const STATE_FIPS: Record<string, string> = {
      AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
      DE: "10", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18",
      IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25",
      MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32",
      NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
      OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47",
      TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55",
      WY: "56", DC: "11",
    };

    const fips = STATE_FIPS[stateCode.toUpperCase()] || "47";
    const demographics = await fetchDemographicsForGeography("state", fips);

    if (!demographics) {
      return NextResponse.json({ error: "Failed to fetch demographics" }, { status: 502 });
    }

    // Update territory with demographics
    const updated = await db.market.update({
      where: { id: params.id },
      data: {
        population: demographics.population,
        medianIncome: Math.round(demographics.medianIncome),
        medianAge: demographics.medianAge,
        householdsWithChildren: demographics.householdsWithChildren,
        totalHouseholds: demographics.totalHouseholds,
        childrenUnder18: demographics.childrenUnder18,
        children5to12: demographics.children5to12,
        demographicsUpdatedAt: new Date(),
      },
    });

    // Save snapshot
    await db.demographicSnapshot.create({
      data: {
        marketId: params.id,
        geometry: territory.boundaryGeoJson || {},
        dataSource: demographics.dataSource,
        indicators: JSON.parse(JSON.stringify(demographics)),
      },
    });

    return NextResponse.json({
      demographics,
      territory: updated,
    });
  } catch (error) {
    console.error("Demographics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch demographics" },
      { status: 500 }
    );
  }
}
