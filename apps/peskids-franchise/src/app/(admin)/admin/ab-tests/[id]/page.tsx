import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import TestStatusControls from "./TestStatusControls";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTestWithStats(id: string) {
  const test = await db.aBTest.findUnique({
    where: { id },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  if (!test) return null;

  // Get variant-level stats
  const variantStats = await db.aBTestAssignment.groupBy({
    by: ["variantId"],
    where: { testId: id },
    _count: { _all: true },
  });

  const variantConversions = await db.aBTestAssignment.groupBy({
    by: ["variantId"],
    where: { testId: id, converted: true },
    _count: { _all: true },
  });

  // Get assignments over time
  const assignmentsOverTime = await db.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE("assignedAt") as date, COUNT(*) as count
    FROM "ABTestAssignment"
    WHERE "testId" = ${id}
    GROUP BY DATE("assignedAt")
    ORDER BY date DESC
    LIMIT 30
  `;

  const variants = test.variants as any[];
  const statsMap = new Map(variantStats.map((v) => [v.variantId, v._count._all]));
  const conversionMap = new Map(variantConversions.map((v) => [v.variantId, v._count._all]));

  const variantResults = variants.map((variant) => {
    const assigned = statsMap.get(variant.id) || 0;
    const converted = conversionMap.get(variant.id) || 0;
    const rate = assigned > 0 ? (converted / assigned) * 100 : 0;

    return {
      ...variant,
      assigned,
      converted,
      conversionRate: rate,
    };
  });

  return {
    test,
    stats: {
      totalAssignments: test._count.assignments,
      variantResults,
      assignmentsOverTime: assignmentsOverTime.map((a) => ({
        date: a.date,
        count: Number(a.count),
      })),
    },
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case "RUNNING":
      return "bg-brand-green text-white";
    case "PAUSED":
      return "bg-brand-orange text-white";
    case "COMPLETED":
      return "bg-brand-cyan text-white";
    case "ARCHIVED":
      return "bg-gray-400 text-white";
    default:
      return "bg-gray-200 text-gray-700";
  }
}

// Calculate statistical significance (simplified z-test)
function calculateSignificance(
  controlConversions: number,
  controlVisitors: number,
  variantConversions: number,
  variantVisitors: number
): { zScore: number; pValue: number; isSignificant: boolean } {
  if (controlVisitors === 0 || variantVisitors === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const p1 = controlConversions / controlVisitors;
  const p2 = variantConversions / variantVisitors;
  const pPooled = (controlConversions + variantConversions) / (controlVisitors + variantVisitors);

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / controlVisitors + 1 / variantVisitors));

  if (se === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const zScore = (p2 - p1) / se;
  // Simplified p-value calculation (two-tailed)
  const pValue = Math.min(1, 2 * (1 - normalCDF(Math.abs(zScore))));

  return {
    zScore: Math.round(zScore * 100) / 100,
    pValue: Math.round(pValue * 1000) / 1000,
    isSignificant: pValue < 0.05,
  };
}

// Normal CDF approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

export default async function ABTestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getTestWithStats(id);

  if (!data) {
    notFound();
  }

  const { test, stats } = data;
  const control = stats.variantResults.find((v) => v.id === "control") || stats.variantResults[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin/ab-tests"
              className="text-gray-400 hover:text-brand-navy transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(test.status)}`}>
              {test.status}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">{test.name}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="font-mono">{test.slug}</span>
            <span>|</span>
            <span>Page: {test.targetPage}</span>
            <span>|</span>
            <span>Traffic: {test.trafficPercent}%</span>
          </div>
          {test.description && (
            <p className="mt-2 text-sm text-gray-600">{test.description}</p>
          )}
        </div>

        <TestStatusControls testId={test.id} currentStatus={test.status} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Total Visitors</div>
            <div className="text-3xl font-bold text-brand-navy">
              {stats.totalAssignments.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Conversions</div>
            <div className="text-3xl font-bold text-brand-cyan">
              {stats.variantResults.reduce((sum, v) => sum + v.converted, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Avg. Conversion Rate</div>
            <div className="text-3xl font-bold text-brand-purple">
              {stats.totalAssignments > 0
                ? ((stats.variantResults.reduce((sum, v) => sum + v.converted, 0) / stats.totalAssignments) * 100).toFixed(1)
                : "0.0"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Test Duration</div>
            <div className="text-3xl font-bold text-brand-orange">
              {Math.ceil((Date.now() - new Date(test.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variant Results */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Variant Performance</h2>
        </CardHeader>
        <CardContent>
          {stats.variantResults.length > 0 ? (
            <div className="space-y-6">
              {stats.variantResults.map((variant, i) => {
                const isControl = variant.id === "control" || i === 0;
                const significance = !isControl
                  ? calculateSignificance(
                      control.converted,
                      control.assigned,
                      variant.converted,
                      variant.assigned
                    )
                  : null;
                const lift = !isControl && control.conversionRate > 0
                  ? ((variant.conversionRate - control.conversionRate) / control.conversionRate) * 100
                  : 0;

                return (
                  <div key={variant.id} className={`p-4 rounded-lg ${isControl ? "bg-gray-50" : "bg-brand-light/30"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${isControl ? "bg-gray-200 text-gray-700" : "bg-brand-cyan/20 text-brand-cyan"}`}>
                          {isControl ? "CONTROL" : variant.id.toUpperCase()}
                        </span>
                        <span className="font-medium text-brand-navy">{variant.name}</span>
                        <span className="text-sm text-gray-400">({variant.weight}%)</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brand-navy">
                          {variant.conversionRate.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {variant.converted} / {variant.assigned}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${isControl ? "bg-gray-400" : "bg-brand-cyan"}`}
                        style={{ width: `${variant.conversionRate}%` }}
                      />
                    </div>

                    {/* Config value */}
                    {variant.config?.value && (
                      <div className="text-sm text-gray-600 mb-2">
                        Value: &quot;{variant.config.value}&quot;
                      </div>
                    )}

                    {/* Stats for variants */}
                    {!isControl && significance && (
                      <div className="flex items-center gap-4 text-sm mt-3 pt-3 border-t border-gray-200">
                        <span className={lift >= 0 ? "text-brand-green" : "text-red-500"}>
                          {lift >= 0 ? "+" : ""}{lift.toFixed(1)}% lift
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          z-score: {significance.zScore}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className={significance.isSignificant ? "text-brand-green font-medium" : "text-gray-500"}>
                          {significance.isSignificant
                            ? "Statistically Significant (p < 0.05)"
                            : `Not significant (p = ${significance.pValue})`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No data yet. Start the test to begin collecting results.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Implementation</h2>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto">
            <pre>{`import { useABTest } from "@/lib/ab-testing/useABTest";

function MyComponent() {
  const { variant, isLoading, trackConversion } = useABTest("${test.slug}");

  if (isLoading) return <DefaultContent />;

  return (
    <div>
      {/* Use variant.config.value for the test element */}
      <h1>{variant?.config?.value || "Default Headline"}</h1>

      {/* Call trackConversion on goal completion */}
      <button onClick={() => trackConversion()}>
        Convert
      </button>
    </div>
  );
}`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Test Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Test Details</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium">{formatDateTime(test.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Element</dt>
              <dd className="font-medium font-mono">{test.element}</dd>
            </div>
            {test.startDate && (
              <div>
                <dt className="text-gray-500">Start Date</dt>
                <dd className="font-medium">{formatDateTime(test.startDate)}</dd>
              </div>
            )}
            {test.endDate && (
              <div>
                <dt className="text-gray-500">End Date</dt>
                <dd className="font-medium">{formatDateTime(test.endDate)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
