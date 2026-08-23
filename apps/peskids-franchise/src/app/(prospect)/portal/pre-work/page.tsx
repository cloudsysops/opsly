import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getPreWorkData(prospectId: string) {
  const [modules, submissions] = await Promise.all([
    db.preWorkModule.findMany({
      orderBy: { sequence: "asc" },
    }),
    db.preWorkSubmission.findMany({
      where: { prospectId },
      include: { module: true },
    }),
  ]);

  return { modules, submissions };
}

export default async function PreWorkPage() {
  const session = await auth();
  const { modules, submissions } = await getPreWorkData(session!.user.id);

  const submissionMap = new Map(
    submissions.map((s) => [s.moduleId, s])
  );

  const completedCount = submissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
  ).length;

  return (
    <WideContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Pre-Work Modules</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Complete all 5 modules to demonstrate your commitment and prepare for
          your interview. Take your time and do quality work—this is how we
          evaluate your fit as a franchise partner.
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-brand-navy">Your Progress</h2>
            <span className="text-sm text-gray-500">
              {completedCount} of {modules.length} completed
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all"
              style={{
                width: `${modules.length > 0 ? (completedCount / modules.length) * 100 : 0}%`,
              }}
            />
          </div>
          {completedCount === modules.length && modules.length > 0 && (
            <p className="mt-4 text-brand-green font-medium">
              Congratulations! You&apos;ve completed all pre-work modules.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Module Cards */}
      <div className="space-y-4">
        {modules.map((module, index) => {
          const submission = submissionMap.get(module.id);
          const status = submission?.status || "NOT_STARTED";

          const statusConfig = {
            NOT_STARTED: {
              label: "Not Started",
              color: "text-gray-400",
              bg: "bg-gray-100",
            },
            DRAFT: {
              label: "In Progress",
              color: "text-brand-cyan",
              bg: "bg-brand-cyan/10",
            },
            SUBMITTED: {
              label: "Submitted",
              color: "text-brand-yellow",
              bg: "bg-brand-yellow/10",
            },
            UNDER_REVIEW: {
              label: "Under Review",
              color: "text-brand-purple",
              bg: "bg-brand-purple/10",
            },
            APPROVED: {
              label: "Approved",
              color: "text-brand-green",
              bg: "bg-brand-green/10",
            },
            NEEDS_REVISION: {
              label: "Needs Revision",
              color: "text-brand-orange",
              bg: "bg-brand-orange/10",
            },
          };

          const config = statusConfig[status as keyof typeof statusConfig];

          return (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        status === "APPROVED"
                          ? "bg-brand-green text-white"
                          : status === "SUBMITTED" || status === "UNDER_REVIEW"
                          ? "bg-brand-cyan text-white"
                          : status === "DRAFT"
                          ? "bg-brand-cyan/20 text-brand-cyan"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {status === "APPROVED" ? (
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        <span className="font-bold text-sm sm:text-base">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-brand-navy">
                        {module.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full self-start ${config.bg} ${config.color}`}
                  >
                    {config.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    {module.isRequired && (
                      <span className="text-brand-orange">Required</span>
                    )}
                    {submission?.score && (
                      <span className="ml-4">
                        Score: {submission.score}/10
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/portal/pre-work/${module.slug}`}
                    className="px-4 py-2.5 sm:py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors text-center"
                  >
                    {status === "NOT_STARTED"
                      ? "Start Module"
                      : status === "DRAFT"
                      ? "Continue"
                      : "View"}
                  </Link>
                </div>

                {submission?.reviewNotes && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">
                      Reviewer Notes:
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {submission.reviewNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              Pre-work modules are not yet available for your account.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Please contact us if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      )}
    </WideContainer>
  );
}
