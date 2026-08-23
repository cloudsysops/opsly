import { Metadata } from "next";
import { db } from "@/lib/db";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { getSourceLabel, getMediumLabel } from "@/lib/attribution/capture";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead Attribution Report | FranchiseSTC Admin",
};

async function getAttributionData(startDate?: Date, endDate?: Date) {
  const where = {
    ...(startDate || endDate
      ? {
          firstTouchedAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const attributions = await db.leadAttribution.findMany({
    where,
    include: {
      prospect: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          pipelineStage: true,
          prospectScore: true,
          createdAt: true,
        },
      },
      touches: {
        orderBy: { touchedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { firstTouchedAt: "desc" },
  });

  // Aggregate by source
  const sourceMap = new Map<string, { count: number; converted: number; avgScore: number; scores: number[] }>();
  const mediumMap = new Map<string, { count: number; converted: number }>();
  const campaignMap = new Map<string, { count: number; converted: number }>();

  const selectedStages = ["PRE_WORK_IN_PROGRESS", "PRE_WORK_COMPLETE", "INTERVIEW", "SELECTION_REVIEW", "SELECTED"];

  for (const attr of attributions) {
    const source = attr.utmSource || "(direct)";
    const medium = attr.utmMedium || "(none)";
    const campaign = attr.utmCampaign || "(none)";
    const isConverted = selectedStages.includes(attr.prospect.pipelineStage);

    // Source aggregation
    const sourceData = sourceMap.get(source) || { count: 0, converted: 0, avgScore: 0, scores: [] };
    sourceData.count++;
    if (isConverted) sourceData.converted++;
    sourceData.scores.push(attr.prospect.prospectScore);
    sourceMap.set(source, sourceData);

    // Medium aggregation
    const mediumData = mediumMap.get(medium) || { count: 0, converted: 0 };
    mediumData.count++;
    if (isConverted) mediumData.converted++;
    mediumMap.set(medium, mediumData);

    // Campaign aggregation
    if (campaign !== "(none)") {
      const campaignData = campaignMap.get(campaign) || { count: 0, converted: 0 };
      campaignData.count++;
      if (isConverted) campaignData.converted++;
      campaignMap.set(campaign, campaignData);
    }
  }

  // Calculate average scores for sources
  const bySource = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      converted: data.converted,
      conversionRate: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0,
      avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byMedium = Array.from(mediumMap.entries())
    .map(([medium, data]) => ({
      medium,
      count: data.count,
      converted: data.converted,
      conversionRate: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byCampaign = Array.from(campaignMap.entries())
    .map(([campaign, data]) => ({
      campaign,
      count: data.count,
      converted: data.converted,
      conversionRate: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    attributions,
    summary: {
      total: attributions.length,
      bySource,
      byMedium,
      byCampaign,
    },
  };
}

export default async function AttributionReportPage() {
  const { attributions, summary } = await getAttributionData();

  return (
    <WideContainer className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Lead Attribution Report</h1>
        <p className="text-gray-600 mt-1">Understand where your leads are coming from</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-brand-navy">{summary.total}</div>
          <div className="text-sm text-gray-500">Total Attributed Leads</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-brand-green">
            {summary.bySource.find((s) => s.source !== "(direct)")?.source || "N/A"}
          </div>
          <div className="text-sm text-gray-500">Top Traffic Source</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-brand-purple">
            {summary.byCampaign[0]?.campaign || "N/A"}
          </div>
          <div className="text-sm text-gray-500">Top Campaign</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-brand-cyan">
            {summary.bySource.find((s) => s.source !== "(direct)")?.avgScore || 0}
          </div>
          <div className="text-sm text-gray-500">Avg Score (Top Source)</div>
        </div>
      </div>

      {/* Attribution Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* By Source */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-brand-navy">By Source</h2>
          </div>
          <div className="divide-y">
            {summary.bySource.slice(0, 10).map((item) => (
              <div key={item.source} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{getSourceLabel(item.source)}</div>
                  <div className="text-xs text-gray-500">{item.conversionRate}% conversion</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-brand-navy">{item.count}</div>
                  <div className="text-xs text-gray-500">Avg: {item.avgScore}</div>
                </div>
              </div>
            ))}
            {summary.bySource.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">No data</div>
            )}
          </div>
        </div>

        {/* By Medium */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-brand-navy">By Medium</h2>
          </div>
          <div className="divide-y">
            {summary.byMedium.slice(0, 10).map((item) => (
              <div key={item.medium} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{getMediumLabel(item.medium)}</div>
                  <div className="text-xs text-gray-500">{item.conversionRate}% conversion</div>
                </div>
                <div className="font-semibold text-brand-navy">{item.count}</div>
              </div>
            ))}
            {summary.byMedium.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">No data</div>
            )}
          </div>
        </div>

        {/* By Campaign */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-brand-navy">By Campaign</h2>
          </div>
          <div className="divide-y">
            {summary.byCampaign.slice(0, 10).map((item) => (
              <div key={item.campaign} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 truncate max-w-[150px]">{item.campaign}</div>
                  <div className="text-xs text-gray-500">{item.conversionRate}% conversion</div>
                </div>
                <div className="font-semibold text-brand-navy">{item.count}</div>
              </div>
            ))}
            {summary.byCampaign.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">No campaigns tracked</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-brand-navy">Recent Attributed Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Prospect</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Source</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Medium</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Campaign</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Stage</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">First Touched</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attributions.slice(0, 25).map((attr) => (
                <tr key={attr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/prospects/${attr.prospect.id}`}
                      className="text-brand-cyan hover:underline font-medium"
                    >
                      {attr.prospect.firstName} {attr.prospect.lastName}
                    </Link>
                    <div className="text-xs text-gray-500">{attr.prospect.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {getSourceLabel(attr.utmSource)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getMediumLabel(attr.utmMedium)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">
                    {attr.utmCampaign || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${attr.prospect.prospectScore >= 70 ? "text-green-600" : attr.prospect.prospectScore >= 40 ? "text-yellow-600" : "text-gray-600"}`}>
                      {attr.prospect.prospectScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {attr.prospect.pipelineStage.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(attr.firstTouchedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attributions.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No attributed leads yet. Attribution data will appear when leads arrive with UTM parameters.
            </div>
          )}
        </div>
      </div>
    </WideContainer>
  );
}
