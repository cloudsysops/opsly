import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_SURVEY_TYPES = ["MILESTONE_PREWORK", "MILESTONE_30DAY", "MILESTONE_90DAY", "QUARTERLY"] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get("type");
    if (!type || !VALID_SURVEY_TYPES.includes(type as (typeof VALID_SURVEY_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid survey type" }, { status: 400 });
    }

    // Check if already completed within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existing = await db.surveyResponse.findFirst({
      where: {
        prospectId: session.user.id,
        surveyType: type as (typeof VALID_SURVEY_TYPES)[number],
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Check if there's a pending milestone survey
    const { checkSurveyMilestones } = await import("@/lib/feedback/survey-triggers");
    const pendingType = await checkSurveyMilestones(session.user.id);

    return NextResponse.json({
      hasPending: pendingType === type,
      alreadyCompleted: !!existing,
    });
  } catch (error) {
    console.error("Survey check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
