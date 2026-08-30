import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import { ProspectsTable } from "@/components/admin/ProspectsTable";

export const dynamic = 'force-dynamic';

interface SearchParams {
  stage?: string;
  search?: string;
  page?: string;
}

// CRM stage labels (excludes SELECTED - those are franchisees)
const stageLabels: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  INITIAL_CONTACT: "Initial Contact",
  DISCOVERY_CALL: "Discovery Call",
  PRE_WORK_IN_PROGRESS: "Pre-Work In Progress",
  PRE_WORK_COMPLETE: "Pre-Work Complete",
  INTERVIEW: "Interview",
  SELECTION_REVIEW: "Selection Review",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const stageColors: Record<string, string> = {
  NEW_INQUIRY: "bg-brand-orange/10 text-brand-orange",
  INITIAL_CONTACT: "bg-blue-100 text-blue-700",
  DISCOVERY_CALL: "bg-purple-100 text-purple-700",
  PRE_WORK_IN_PROGRESS: "bg-brand-cyan/10 text-brand-cyan",
  PRE_WORK_COMPLETE: "bg-brand-green/10 text-brand-green",
  INTERVIEW: "bg-yellow-100 text-yellow-700",
  SELECTION_REVIEW: "bg-indigo-100 text-indigo-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-700",
};

const interestLabels: Record<string, string> = {
  READY_TO_START: "Ready to Start",
  ACTIVELY_SEEKING_FUNDING: "Seeking Funding",
  SERIOUSLY_CONSIDERING: "Seriously Considering",
  JUST_EXPLORING: "Just Exploring",
  GATHERING_INFORMATION: "Gathering Info",
};

async function getProspects(params: SearchParams) {
  const page = parseInt(params.page || "1");
  const limit = 20;
  const where: Record<string, unknown> = {};

  // Always exclude SELECTED prospects (they're franchisees now)
  if (params.stage) {
    where.pipelineStage = params.stage;
  } else {
    where.pipelineStage = { not: "SELECTED" };
  }

  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { preferredTerritory: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [prospects, total] = await Promise.all([
    db.prospect.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        preferredTerritory: true,
        interestLevel: true,
        pipelineStage: true,
        prospectScore: true,
        createdAt: true,
      },
    }),
    db.prospect.count({ where }),
  ]);

  return {
    prospects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { prospects, pagination } = await getProspects(params);

  return (
    <WideContainer className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Prospects</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage and track franchise prospect inquiries
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <input
                type="text"
                name="search"
                placeholder="Search name, email, territory..."
                defaultValue={params.search}
                className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base sm:text-sm"
              />
            </div>
            <div className="flex gap-3 sm:gap-4">
              <select
                name="stage"
                defaultValue={params.stage || ""}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base sm:text-sm"
              >
                <option value="">All Stages</option>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 sm:py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-base sm:text-sm font-medium"
              >
                Filter
              </button>
              {(params.search || params.stage) && (
                <Link
                  href="/admin/crm/prospects"
                  className="px-4 py-2.5 sm:py-2 text-gray-600 hover:text-brand-navy flex items-center"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Prospects Table with Bulk Actions */}
      <Card>
        <ProspectsTable
          prospects={prospects}
          stageLabels={stageLabels}
          stageColors={stageColors}
          interestLabels={interestLabels}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-500 text-center sm:text-left">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </div>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Link
                  href={`/admin/crm/prospects?page=${pagination.page - 1}${
                    params.stage ? `&stage=${params.stage}` : ""
                  }${params.search ? `&search=${params.search}` : ""}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Previous
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/admin/crm/prospects?page=${pagination.page + 1}${
                    params.stage ? `&stage=${params.stage}` : ""
                  }${params.search ? `&search=${params.search}` : ""}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </WideContainer>
  );
}
