import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeedbackDashboard } from "@/components/admin/feedback/FeedbackDashboard";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          Feedback & Product Quality Score
        </h1>
        <p className="mt-1 text-gray-600">
          Monitor franchise platform satisfaction, NPS, and quality metrics
        </p>
      </div>
      <FeedbackDashboard />
    </div>
  );
}
