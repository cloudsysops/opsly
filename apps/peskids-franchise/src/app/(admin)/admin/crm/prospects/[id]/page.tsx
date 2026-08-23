import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProspectDetailTabs } from "@/components/admin/prospect-detail/ProspectDetailTabs";

export const dynamic = 'force-dynamic';

const stageLabels: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  INITIAL_CONTACT: "Initial Contact",
  DISCOVERY_CALL: "Discovery Call",
  PRE_WORK_IN_PROGRESS: "Pre-Work In Progress",
  PRE_WORK_COMPLETE: "Pre-Work Complete",
  INTERVIEW: "Interview",
  SELECTION_REVIEW: "Selection Review",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const stageColors: Record<string, string> = {
  NEW_INQUIRY: "bg-brand-orange/10 text-brand-orange border-brand-orange",
  INITIAL_CONTACT: "bg-blue-100 text-blue-700 border-blue-400",
  DISCOVERY_CALL: "bg-purple-100 text-purple-700 border-purple-400",
  PRE_WORK_IN_PROGRESS: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan",
  PRE_WORK_COMPLETE: "bg-brand-green/10 text-brand-green border-brand-green",
  INTERVIEW: "bg-yellow-100 text-yellow-700 border-yellow-400",
  SELECTION_REVIEW: "bg-indigo-100 text-indigo-700 border-indigo-400",
  SELECTED: "bg-green-100 text-green-700 border-green-400",
  REJECTED: "bg-red-100 text-red-700 border-red-400",
  WITHDRAWN: "bg-gray-100 text-gray-700 border-gray-400",
};

async function getProspect(id: string) {
  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      notes: {
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" },
        ],
      },
      preWorkSubmissions: {
        include: {
          module: {
            select: {
              id: true,
              slug: true,
              title: true,
              sequence: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      documents: true,
      conversations: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      visitors: {
        include: {
          sessions: {
            orderBy: { startedAt: "desc" },
            take: 5,
            include: {
              pageViews: {
                orderBy: { enteredAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return prospect;
}

export default async function ProspectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const prospect = await getProspect(id);

  if (!prospect) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/prospects"
            className="text-sm text-brand-purple hover:underline mb-2 inline-block"
          >
            ← Back to Prospects
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            {prospect.firstName} {prospect.lastName}
          </h1>
          <p className="mt-1 text-gray-600 text-sm sm:text-base break-all">{prospect.email}</p>
        </div>
        <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
          <div className="text-lg sm:text-2xl font-bold text-brand-navy whitespace-nowrap">
            Score: {prospect.prospectScore}
          </div>
          <span
            className={`inline-flex px-3 py-1 text-xs sm:text-sm font-medium rounded-full border whitespace-nowrap ${
              stageColors[prospect.pipelineStage]
            }`}
          >
            {stageLabels[prospect.pipelineStage]}
          </span>
        </div>
      </div>

      {/* Tabbed Content */}
      <ProspectDetailTabs prospect={prospect} />
    </div>
  );
}
