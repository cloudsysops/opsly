import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_SURVEY_TYPES = ["MILESTONE_PREWORK", "MILESTONE_30DAY", "MILESTONE_90DAY", "QUARTERLY"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { surveyType, npsScore, cesScore, usabilityScore, helpfulnessScore, reliabilityScore, whatWorksWell, whatToImprove } = body;

    // Validate surveyType
    if (!surveyType || !VALID_SURVEY_TYPES.includes(surveyType)) {
      return NextResponse.json({ error: "Invalid survey type" }, { status: 400 });
    }

    // Validate required scores
    if (npsScore === undefined || npsScore === null || npsScore < 0 || npsScore > 10) {
      return NextResponse.json({ error: "NPS score must be 0-10" }, { status: 400 });
    }
    if (cesScore === undefined || cesScore === null || cesScore < 1 || cesScore > 7) {
      return NextResponse.json({ error: "CES score must be 1-7" }, { status: 400 });
    }
    if (usabilityScore === undefined || usabilityScore === null || usabilityScore < 1 || usabilityScore > 5) {
      return NextResponse.json({ error: "Usability score must be 1-5" }, { status: 400 });
    }
    if (helpfulnessScore === undefined || helpfulnessScore === null || helpfulnessScore < 1 || helpfulnessScore > 5) {
      return NextResponse.json({ error: "Helpfulness score must be 1-5" }, { status: 400 });
    }
    if (reliabilityScore === undefined || reliabilityScore === null || reliabilityScore < 1 || reliabilityScore > 5) {
      return NextResponse.json({ error: "Reliability score must be 1-5" }, { status: 400 });
    }

    // Check for duplicate within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existing = await db.surveyResponse.findFirst({
      where: {
        prospectId: session.user.id,
        surveyType,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted this survey recently" },
        { status: 409 }
      );
    }

    // Create the survey response
    const surveyResponse = await db.surveyResponse.create({
      data: {
        prospectId: session.user.id,
        surveyType,
        npsScore: Math.round(npsScore),
        cesScore: Math.round(cesScore),
        usabilityScore: Math.round(usabilityScore),
        helpfulnessScore: Math.round(helpfulnessScore),
        reliabilityScore: Math.round(reliabilityScore),
        whatWorksWell: whatWorksWell || null,
        whatToImprove: whatToImprove || null,
      },
    });

    return NextResponse.json({ success: true, id: surveyResponse.id });
  } catch (error) {
    console.error("Survey submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
