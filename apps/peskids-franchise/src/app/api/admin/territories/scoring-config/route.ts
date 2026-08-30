import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await db.scoringConfig.findUnique({
      where: { region: "US" },
    });

    if (!config) {
      // Return defaults
      return NextResponse.json({
        region: "US",
        childrenDensityWeight: 0.25,
        householdIncomeWeight: 0.20,
        householdsWithKidsWeight: 0.15,
        competitorSaturationWeight: 0.15,
        populationDensityWeight: 0.10,
        schoolDensityWeight: 0.10,
        educationLevelWeight: 0.05,
        childrenDensityBenchmark: 500,
        householdIncomeBenchmark: 75000,
        schoolDensityBenchmark: 2,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Scoring config fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scoring config" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // Validate weights sum to ~1.0
    const weightKeys = [
      "childrenDensityWeight",
      "householdIncomeWeight",
      "householdsWithKidsWeight",
      "competitorSaturationWeight",
      "populationDensityWeight",
      "schoolDensityWeight",
      "educationLevelWeight",
    ];

    const weights = weightKeys.map((k) => updates[k]).filter((v) => v !== undefined);
    if (weights.length > 0) {
      const sum = weights.reduce((a: number, b: number) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01) {
        return NextResponse.json(
          { error: `Weights must sum to 1.0 (currently ${sum.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    const config = await db.scoringConfig.upsert({
      where: { region: "US" },
      create: {
        region: "US",
        ...updates,
      },
      update: updates,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Scoring config update error:", error);
    return NextResponse.json(
      { error: "Failed to update scoring config" },
      { status: 500 }
    );
  }
}
