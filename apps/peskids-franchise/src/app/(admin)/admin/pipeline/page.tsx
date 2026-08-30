import { db } from "@/lib/db";
import { Card } from "@/components/shared/Card";
import { FullWidthContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { PipelineStage } from "@prisma/client";

export const dynamic = 'force-dynamic';

const stages = [
  { key: PipelineStage.NEW_INQUIRY, label: "New Inquiry", color: "bg-brand-orange" },
  { key: PipelineStage.INITIAL_CONTACT, label: "Initial Contact", color: "bg-blue-500" },
  { key: PipelineStage.DISCOVERY_CALL, label: "Discovery Call", color: "bg-purple-500" },
  { key: PipelineStage.PRE_WORK_IN_PROGRESS, label: "Pre-Work", color: "bg-brand-cyan" },
  { key: PipelineStage.PRE_WORK_COMPLETE, label: "Complete", color: "bg-brand-green" },
  { key: PipelineStage.INTERVIEW, label: "Interview", color: "bg-yellow-500" },
  { key: PipelineStage.SELECTION_REVIEW, label: "Review", color: "bg-indigo-500" },
];

async function getPipelineData() {
  const prospects = await db.prospect.findMany({
    where: {
      pipelineStage: {
        in: stages.map((s) => s.key),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      preferredTerritory: true,
      pipelineStage: true,
      prospectScore: true,
      createdAt: true,
      preWorkStatus: true,
    },
  });

  // Group by stage
  const grouped: Record<string, typeof prospects> = {};
  stages.forEach((stage) => {
    grouped[stage.key] = prospects.filter((p) => p.pipelineStage === stage.key);
  });

  return grouped;
}

export default async function PipelinePage() {
  const pipelineData = await getPipelineData();

  return (
    <FullWidthContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Pipeline Board</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Kanban view of your prospect pipeline
        </p>
      </div>

      {/* Pipeline Board - Scrollable on mobile, grid on desktop */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 sm:gap-4 lg:grid lg:grid-cols-7" style={{ minWidth: "min(1200px, max-content)" }}>
          {stages.map((stage) => (
            <div
              key={stage.key}
              className="flex-shrink-0 w-[260px] sm:w-[200px] lg:w-auto lg:flex-1 bg-gray-50 rounded-lg p-3 sm:p-4"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <h3 className="font-semibold text-brand-navy text-sm">
                    {stage.label}
                  </h3>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full">
                  {pipelineData[stage.key]?.length || 0}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {pipelineData[stage.key]?.map((prospect) => (
                  <Link
                    key={prospect.id}
                    href={`/admin/prospects/${prospect.id}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${stage.color}`}
                          >
                            {getInitials(
                              `${prospect.firstName} ${prospect.lastName}`
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-brand-navy truncate">
                              {prospect.firstName} {prospect.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {prospect.preferredTerritory || "No territory"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-brand-navy">
                              {prospect.prospectScore}
                            </span>
                          </div>
                        </div>

                        {/* Pre-work status indicator for relevant stages */}
                        {(stage.key === "PRE_WORK_IN_PROGRESS" ||
                          stage.key === "PRE_WORK_COMPLETE") && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                prospect.preWorkStatus === "APPROVED"
                                  ? "bg-green-100 text-green-700"
                                  : prospect.preWorkStatus === "SUBMITTED"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {prospect.preWorkStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}

                        {/* Days in stage */}
                        <div className="mt-2 text-xs text-gray-400">
                          {Math.floor(
                            (Date.now() - new Date(prospect.createdAt).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          days
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}

                {(!pipelineData[stage.key] ||
                  pipelineData[stage.key].length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No prospects
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-medium">Score</span> = Prospect qualification
          score (0-100)
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Days</span> = Time in current stage
        </div>
      </div>
    </FullWidthContainer>
  );
}
