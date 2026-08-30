import { db } from "@/lib/db";

/**
 * Check if a franchisee has hit a survey milestone.
 * Returns the SurveyType to trigger, or null if none are pending.
 */
export async function checkSurveyMilestones(prospectId: string): Promise<string | null> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: {
      preWorkStatus: true,
      selectedAt: true,
      surveyResponses: {
        select: { surveyType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!prospect) return null;

  // Only count surveys completed within the last 90 days
  const completedTypes = new Set(
    prospect.surveyResponses
      .filter((sr) => {
        const daysSince = (Date.now() - sr.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 90;
      })
      .map((sr) => sr.surveyType)
  );

  // Pre-work completion milestone (APPROVED = completed all pre-work)
  if (prospect.preWorkStatus === "APPROVED" && !completedTypes.has("MILESTONE_PREWORK")) {
    return "MILESTONE_PREWORK";
  }

  // 30-day milestone (30 days after selection)
  if (prospect.selectedAt) {
    const daysSinceSelected = (Date.now() - prospect.selectedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceSelected >= 30 && !completedTypes.has("MILESTONE_30DAY")) {
      return "MILESTONE_30DAY";
    }

    // 90-day milestone
    if (daysSinceSelected >= 90 && !completedTypes.has("MILESTONE_90DAY")) {
      return "MILESTONE_90DAY";
    }
  }

  return null;
}
