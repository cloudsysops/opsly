import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import SurveyForm from "@/components/prospect/SurveyForm";

export const dynamic = "force-dynamic";

type SurveyType = "MILESTONE_PREWORK" | "MILESTONE_30DAY" | "MILESTONE_90DAY" | "QUARTERLY";

const VALID_TYPES: SurveyType[] = ["MILESTONE_PREWORK", "MILESTONE_30DAY", "MILESTONE_90DAY", "QUARTERLY"];

export default async function FeedbackSurveyPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await auth();

  if (!session || session.user.role !== "PROSPECT") {
    redirect("/login");
  }

  const rawType = searchParams.type || "QUARTERLY";
  const surveyType: SurveyType = VALID_TYPES.includes(rawType as SurveyType)
    ? (rawType as SurveyType)
    : "QUARTERLY";

  // Check if already completed within 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const existing = await db.surveyResponse.findFirst({
    where: {
      prospectId: session.user.id,
      surveyType,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const alreadyCompleted = !!existing;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <SurveyForm alreadyCompleted={alreadyCompleted} surveyType={surveyType} />
    </div>
  );
}
