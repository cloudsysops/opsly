import { db } from "@/lib/db";

export async function calculateMonthlyPQS(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // Get survey responses for the month
  const surveys = await db.surveyResponse.findMany({
    where: { createdAt: { gte: startDate, lt: endDate } },
  });

  // Get micro-feedback for the month
  const microFeedback = await db.feedback.findMany({
    where: { createdAt: { gte: startDate, lt: endDate } },
  });

  // Calculate NPS
  let npsScore = 0;
  if (surveys.length > 0) {
    const promoters = surveys.filter((s) => s.npsScore >= 9).length;
    const detractors = surveys.filter((s) => s.npsScore <= 6).length;
    npsScore = ((promoters - detractors) / surveys.length) * 100;
  }

  // Calculate averages
  const cesScore =
    surveys.length > 0
      ? surveys.reduce((sum, s) => sum + s.cesScore, 0) / surveys.length
      : 0;
  const usabilityAvg =
    surveys.length > 0
      ? surveys.reduce((sum, s) => sum + s.usabilityScore, 0) / surveys.length
      : 0;
  const helpfulnessAvg =
    surveys.length > 0
      ? surveys.reduce((sum, s) => sum + s.helpfulnessScore, 0) /
        surveys.length
      : 0;
  const reliabilityAvg =
    surveys.length > 0
      ? surveys.reduce((sum, s) => sum + s.reliabilityScore, 0) /
        surveys.length
      : 0;

  const microFeedbackAvg =
    microFeedback.length > 0
      ? microFeedback.reduce((sum, f) => sum + f.rating, 0) /
        microFeedback.length
      : 0;

  // Get previous month for trend
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const previous = await db.productQualityScore.findUnique({
    where: { year_month: { year: prevYear, month: prevMonth } },
  });

  let trend: "IMPROVING" | "STABLE" | "DECLINING" | "NEW" = "NEW";
  if (previous) {
    const diff = npsScore - previous.npsScore;
    if (diff > 5) trend = "IMPROVING";
    else if (diff < -5) trend = "DECLINING";
    else trend = "STABLE";
  }

  // Upsert the monthly score
  return db.productQualityScore.upsert({
    where: { year_month: { year, month } },
    create: {
      year,
      month,
      npsScore,
      cesScore,
      usabilityAvg,
      helpfulnessAvg,
      reliabilityAvg,
      microFeedbackCount: microFeedback.length,
      microFeedbackAvg,
      surveyResponseCount: surveys.length,
      totalFeedbackCount: surveys.length + microFeedback.length,
      previousNps: previous?.npsScore ?? null,
      trend,
    },
    update: {
      npsScore,
      cesScore,
      usabilityAvg,
      helpfulnessAvg,
      reliabilityAvg,
      microFeedbackCount: microFeedback.length,
      microFeedbackAvg,
      surveyResponseCount: surveys.length,
      totalFeedbackCount: surveys.length + microFeedback.length,
      previousNps: previous?.npsScore ?? null,
      trend,
    },
  });
}
