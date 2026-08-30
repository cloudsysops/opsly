import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get survey responses from last 90 days
    const surveys = await db.surveyResponse.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
    });

    // Get micro-feedback from last 90 days
    const microFeedback = await db.feedback.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
    });

    // Calculate NPS
    let npsScore = 0;
    if (surveys.length > 0) {
      const promoters = surveys.filter((s) => s.npsScore >= 9).length;
      const detractors = surveys.filter((s) => s.npsScore <= 6).length;
      npsScore = Math.round(
        ((promoters - detractors) / surveys.length) * 100
      );
    }

    // Calculate averages
    const cesScore =
      surveys.length > 0
        ? Number(
            (
              surveys.reduce((sum, s) => sum + s.cesScore, 0) / surveys.length
            ).toFixed(1)
          )
        : 0;

    const usabilityAvg =
      surveys.length > 0
        ? Number(
            (
              surveys.reduce((sum, s) => sum + s.usabilityScore, 0) /
              surveys.length
            ).toFixed(1)
          )
        : 0;

    const helpfulnessAvg =
      surveys.length > 0
        ? Number(
            (
              surveys.reduce((sum, s) => sum + s.helpfulnessScore, 0) /
              surveys.length
            ).toFixed(1)
          )
        : 0;

    const reliabilityAvg =
      surveys.length > 0
        ? Number(
            (
              surveys.reduce((sum, s) => sum + s.reliabilityScore, 0) /
              surveys.length
            ).toFixed(1)
          )
        : 0;

    const microFeedbackAvg =
      microFeedback.length > 0
        ? Number(
            (
              microFeedback.reduce((sum, f) => sum + f.rating, 0) /
              microFeedback.length
            ).toFixed(1)
          )
        : 0;

    // Survey response rate (total responses / total surveys possible is unknown, so just count)
    const surveyResponseCount = surveys.length;

    // Monthly trend data: last 12 months
    const twelveMonthsAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      1
    );

    // Try aggregated ProductQualityScore table first
    const aggregatedScores = await db.productQualityScore.findMany({
      where: {
        OR: [
          {
            year: now.getFullYear(),
            month: { lte: now.getMonth() + 1 },
          },
          {
            year: now.getFullYear() - 1,
            month: { gt: now.getMonth() },
          },
        ],
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    let monthlyTrends: Array<{
      month: string;
      nps: number;
      ces: number;
    }>;

    if (aggregatedScores.length > 0) {
      monthlyTrends = aggregatedScores.map((s) => ({
        month: `${s.year}-${String(s.month).padStart(2, "0")}`,
        nps: Number(s.npsScore.toFixed(0)),
        ces: Number(s.cesScore.toFixed(1)),
      }));
    } else {
      // Fallback: compute from raw SurveyResponse data
      const allSurveys = await db.surveyResponse.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        orderBy: { createdAt: "asc" },
      });

      const byMonth = new Map<
        string,
        Array<{ npsScore: number; cesScore: number }>
      >();
      for (const s of allSurveys) {
        const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)!.push(s);
      }

      monthlyTrends = Array.from(byMonth.entries()).map(([month, items]) => {
        const promoters = items.filter((i) => i.npsScore >= 9).length;
        const detractors = items.filter((i) => i.npsScore <= 6).length;
        const nps = Math.round(
          ((promoters - detractors) / items.length) * 100
        );
        const ces = Number(
          (
            items.reduce((sum, i) => sum + i.cesScore, 0) / items.length
          ).toFixed(1)
        );
        return { month, nps, ces };
      });
    }

    return NextResponse.json({
      npsScore,
      cesScore,
      microFeedbackAvg,
      microFeedbackCount: microFeedback.length,
      surveyResponseCount,
      usabilityAvg,
      helpfulnessAvg,
      reliabilityAvg,
      monthlyTrends,
    });
  } catch (error) {
    console.error("Failed to fetch feedback stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
