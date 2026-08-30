import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import CreateTestButton from "./CreateTestButton";

export const dynamic = 'force-dynamic';

interface ABTestWithStats {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetPage: string;
  element: string;
  status: string;
  variants: any;
  trafficPercent: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  _count: {
    assignments: number;
  };
  conversions: number;
}

async function getABTests(): Promise<ABTestWithStats[]> {
  const tests = await db.aBTest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  // Get conversion counts for each test
  const testsWithConversions = await Promise.all(
    tests.map(async (test) => {
      const conversions = await db.aBTestAssignment.count({
        where: {
          testId: test.id,
          converted: true,
        },
      });
      return {
        ...test,
        conversions,
      };
    })
  );

  return testsWithConversions;
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

export default async function ABTestsPage() {
  const tests = await getABTests();

  const runningTests = tests.filter((t) => t.status === "RUNNING");
  const totalAssignments = tests.reduce((sum, t) => sum + t._count.assignments, 0);
  const totalConversions = tests.reduce((sum, t) => sum + t.conversions, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">A/B Tests</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Test variations of headlines, CTAs, and page layouts
          </p>
        </div>
        <CreateTestButton />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Total Tests</div>
            <div className="text-3xl font-bold text-brand-navy">{tests.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-brand-green/10 border-brand-green/30">
          <CardContent className="py-4">
            <div className="text-sm text-brand-green">Running</div>
            <div className="text-3xl font-bold text-brand-green">
              {runningTests.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Total Visitors</div>
            <div className="text-3xl font-bold text-brand-purple">
              {totalAssignments.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Total Conversions</div>
            <div className="text-3xl font-bold text-brand-cyan">
              {totalConversions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">All Tests</h2>
        </CardHeader>
        <CardContent className="p-0">
          {tests.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {tests.map((test) => {
                const variants = test.variants as any[];
                const conversionRate = test._count.assignments > 0
                  ? ((test.conversions / test._count.assignments) * 100).toFixed(1)
                  : "0.0";

                return (
                  <Link
                    key={test.id}
                    href={`/admin/ab-tests/${test.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                          <h3 className="font-semibold text-brand-navy truncate">
                            {test.name}
                          </h3>
                          <span className="text-xs text-gray-400 font-mono">
                            {test.slug}
                          </span>
                        </div>

                        {/* Description */}
                        {test.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                            {test.description}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>
                            Page: <span className="text-brand-navy">{test.targetPage}</span>
                          </span>
                          <span>
                            Variants: <span className="text-brand-purple">{variants.length}</span>
                          </span>
                          <span>
                            Traffic: <span className="text-brand-cyan">{test.trafficPercent}%</span>
                          </span>
                          <span>
                            Created: {formatDateTime(test.createdAt).split(",")[0]}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brand-navy">
                          {conversionRate}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {test.conversions} / {test._count.assignments}
                        </div>
                        <div className="text-xs text-gray-400">
                          conversion rate
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🧪</div>
              <p className="mb-2">No A/B tests yet</p>
              <p className="text-sm">
                Create your first test to start optimizing conversions
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-brand-light/30 border-brand-cyan/20">
        <CardContent className="py-6">
          <h3 className="font-semibold text-brand-navy mb-3">🧪 How A/B Testing Works</h3>
          <div className="grid gap-4 sm:grid-cols-3 text-sm text-gray-600">
            <div>
              <strong className="text-brand-navy">1. Create a Test</strong>
              <p className="mt-1">
                Define variants for a headline, CTA, or page element with different configurations.
              </p>
            </div>
            <div>
              <strong className="text-brand-navy">2. Traffic Split</strong>
              <p className="mt-1">
                Visitors are randomly assigned to variants based on weights. Same visitor always sees same variant.
              </p>
            </div>
            <div>
              <strong className="text-brand-navy">3. Track Results</strong>
              <p className="mt-1">
                Monitor conversion rates per variant to determine the winner with statistical confidence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
