import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const pipelineStages = [
  {
    key: "NEW_INQUIRY",
    label: "Inquiry Received",
    description: "Your inquiry has been received and is being reviewed.",
  },
  {
    key: "INITIAL_CONTACT",
    label: "Initial Contact",
    description: "Our team is preparing to reach out to you.",
  },
  {
    key: "DISCOVERY_CALL",
    label: "Discovery Call",
    description: "Schedule your discovery call with our franchise team.",
  },
  {
    key: "PRE_WORK_IN_PROGRESS",
    label: "Pre-Work Phase",
    description: "Complete all 5 pre-work modules to proceed.",
  },
  {
    key: "PRE_WORK_COMPLETE",
    label: "Pre-Work Review",
    description: "Your pre-work is being reviewed by our team.",
  },
  {
    key: "INTERVIEW",
    label: "Interview",
    description: "Schedule your interview with the selection committee.",
  },
  {
    key: "SELECTION_REVIEW",
    label: "Final Review",
    description: "Your candidacy is under final review.",
  },
  {
    key: "SELECTED",
    label: "Selected!",
    description: "Congratulations! Welcome to the Acme Franchise family!",
  },
];

async function getProspectStatus(prospectId: string) {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      preWorkSubmissions: {
        include: { module: true },
      },
    },
  });

  return prospect;
}

export default async function StatusPage() {
  const session = await auth();
  const prospect = await getProspectStatus(session!.user.id);

  if (!prospect) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load status.</p>
      </div>
    );
  }

  const currentStageIndex = pipelineStages.findIndex(
    (s) => s.key === prospect.pipelineStage
  );

  const completedPreWork = prospect.preWorkSubmissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
  ).length;

  return (
    <WideContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Your Status</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Track your progress through the franchise selection process.
        </p>
      </div>

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <h2 className="text-base sm:text-lg font-semibold text-brand-navy">
            Selection Progress
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {pipelineStages.map((stage, index) => {
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isFuture = index > currentStageIndex;
              const isLast = index === pipelineStages.length - 1;

              return (
                <div key={stage.key} className="relative flex">
                  {/* Left column: dot + connector */}
                  <div className="flex flex-col items-center mr-3 sm:mr-4">
                    {/* Status dot */}
                    <div
                      className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                        isComplete
                          ? "bg-brand-green text-white"
                          : isCurrent
                          ? "bg-brand-cyan text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 min-h-[24px] ${
                          isComplete ? "bg-brand-green" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>

                  {/* Right column: content */}
                  <div className={`flex-1 ${isLast ? "pb-0" : "pb-5 sm:pb-6"}`}>
                    <h3
                      className={`font-medium text-sm sm:text-base leading-tight ${
                        isFuture ? "text-gray-400" : "text-brand-navy"
                      }`}
                    >
                      {stage.label}
                    </h3>
                    <p
                      className={`mt-0.5 text-xs sm:text-sm ${
                        isFuture ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {stage.description}
                    </p>
                    {isCurrent && stage.key === "PRE_WORK_IN_PROGRESS" && (
                      <p className="mt-1 text-xs sm:text-sm text-brand-cyan font-medium">
                        {completedPreWork} of 5 modules completed
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Dates */}
      <Card>
        <CardHeader>
          <h2 className="text-base sm:text-lg font-semibold text-brand-navy">Key Dates</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 p-3 bg-gray-50 rounded-lg">
              <dt className="text-xs sm:text-sm text-gray-500">Inquiry Submitted</dt>
              <dd className="font-medium text-sm sm:text-sm text-brand-navy">{formatDate(prospect.createdAt)}</dd>
            </div>
            {prospect.preWorkStartedAt && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 p-3 bg-gray-50 rounded-lg">
                <dt className="text-xs sm:text-sm text-gray-500">Pre-Work Started</dt>
                <dd className="font-medium text-sm sm:text-sm text-brand-navy">
                  {formatDate(prospect.preWorkStartedAt)}
                </dd>
              </div>
            )}
            {prospect.preWorkCompletedAt && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 p-3 bg-gray-50 rounded-lg">
                <dt className="text-xs sm:text-sm text-gray-500">Pre-Work Completed</dt>
                <dd className="font-medium text-sm sm:text-sm text-brand-navy">
                  {formatDate(prospect.preWorkCompletedAt)}
                </dd>
              </div>
            )}
            {prospect.lastContactAt && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 p-3 bg-gray-50 rounded-lg">
                <dt className="text-xs sm:text-sm text-gray-500">Last Contact</dt>
                <dd className="font-medium text-sm sm:text-sm text-brand-navy">
                  {formatDate(prospect.lastContactAt)}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className="text-base sm:text-lg font-semibold text-brand-navy">
            Recent Activity
          </h2>
        </CardHeader>
        <CardContent>
          {prospect.activities.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {prospect.activities.map((activity) => (
                <div key={activity.id} className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-brand-cyan" />
                  <div>
                    <p className="text-gray-600">{activity.description}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs sm:text-sm">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    </WideContainer>
  );
}
