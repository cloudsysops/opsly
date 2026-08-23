"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  MapPinIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface IndustryBenchmark {
  id: string;
  companyName: string;
  companyType: string;
  parentCompany: string | null;
  category: string;
  dataYear: number;
  systemWideRevenue: number | null;
  franchiseeCount: number | null;
  companyOwnedUnits: number | null;
  totalUnits: number | null;
  avgRevenuePerUnit: number | null;
  topPerformerRevenue: number | null;
  royaltyRate: number | null;
  childrenEnrolled: number | null;
  fundingRaised: number | null;
  dataSource: string | null;
  lastVerifiedAt: string | null;
  isStale?: boolean;
}

interface GrowthMilestone {
  id: string;
  name: string;
  targetYear: number;
  systemWideRevenueTarget: number | null;
  avgRevenuePerUnitTarget: number | null;
  franchiseeCountTarget: number | null;
  statesTarget: number | null;
  childrenEnrolledTarget: number | null;
  operatingMarginTarget: number | null;
  comparableCompany: string | null;
  keyObjectives: string[] | null;
}

interface STCMetrics {
  systemWideRevenue: number;
  avgRevenuePerUnit: number;
  activeFranchisees: number;
  statesOperating: number;
  asOfDate: string;
}

function formatCurrency(value: number | null, compact = false): string {
  if (value === null || value === undefined) return "—";
  if (compact && value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function ProgressBar({
  current,
  target,
  label,
}: {
  current: number;
  target: number;
  label: string;
}) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = percentage >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">
          {percentage.toFixed(0)}%
          {isComplete && (
            <CheckCircleIcon className="inline h-4 w-4 ml-1 text-green-500" />
          )}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isComplete
              ? "bg-green-500"
              : percentage > 50
                ? "bg-blue-500"
                : percentage > 25
                  ? "bg-yellow-500"
                  : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function IndustryBenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([]);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  const [stcMetrics, setStcMetrics] = useState<STCMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/industry-benchmarks");
      const data = await res.json();
      setBenchmarks(data.benchmarks || []);
      setMilestones(data.milestones || []);
      setStcMetrics(data.currentSTCMetrics);
      if (data.milestones?.length > 0) {
        setSelectedMilestone(data.milestones[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch benchmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const acquirers = benchmarks.filter((b) => b.companyType === "ACQUIRER");
  const competitors = benchmarks.filter(
    (b) => b.companyType === "COMPETITOR" || b.companyType === "ACQUISITION_TARGET"
  );
  const currentMilestone = milestones.find((m) => m.id === selectedMilestone);

  // Find Soccer Shots as primary comparison
  const soccerShots = benchmarks.find((b) => b.companyName === "Soccer Shots");

  if (loading) {
    return (
      <WideContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Industry Benchmarking
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track STC progress against industry leaders and acquisition targets
            </p>
          </div>
          <Link
            href="/admin/settings/benchmarks"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Manage Benchmarks
          </Link>
        </div>

        {/* STC Current Status */}
        <div className="bg-gradient-to-r from-brand-purple to-brand-navy rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Acme Franchise - Current Status</h2>
            {stcMetrics && (
              <span className="text-sm text-white/70">
                As of {new Date(stcMetrics.asOfDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold">
                {formatCurrency(stcMetrics?.systemWideRevenue || 0, true)}
              </div>
              <div className="text-sm text-white/70">YTD System Revenue</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {stcMetrics?.activeFranchisees || 0}
              </div>
              <div className="text-sm text-white/70">Active Franchisees</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {formatCurrency(stcMetrics?.avgRevenuePerUnit || 0, true)}
              </div>
              <div className="text-sm text-white/70">Avg Revenue/Unit</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {stcMetrics?.statesOperating || 0}
              </div>
              <div className="text-sm text-white/70">States Operating</div>
            </div>
          </div>
        </div>

        {/* Milestone Progress */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Growth Milestone Progress
              </h2>
              <div className="flex gap-2">
                {milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMilestone(m.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      selectedMilestone === m.id
                        ? "bg-brand-purple text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {currentMilestone && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Target Year: {currentMilestone.targetYear}</span>
                  {currentMilestone.comparableCompany && (
                    <span className="text-brand-purple">
                      Comparable: {currentMilestone.comparableCompany}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentMilestone.systemWideRevenueTarget && (
                    <ProgressBar
                      current={stcMetrics?.systemWideRevenue || 0}
                      target={Number(currentMilestone.systemWideRevenueTarget)}
                      label={`System Revenue → ${formatCurrency(Number(currentMilestone.systemWideRevenueTarget), true)}`}
                    />
                  )}
                  {currentMilestone.franchiseeCountTarget && (
                    <ProgressBar
                      current={stcMetrics?.activeFranchisees || 0}
                      target={currentMilestone.franchiseeCountTarget}
                      label={`Franchisees → ${currentMilestone.franchiseeCountTarget}`}
                    />
                  )}
                  {currentMilestone.avgRevenuePerUnitTarget && (
                    <ProgressBar
                      current={stcMetrics?.avgRevenuePerUnit || 0}
                      target={Number(currentMilestone.avgRevenuePerUnitTarget)}
                      label={`Avg Revenue/Unit → ${formatCurrency(Number(currentMilestone.avgRevenuePerUnitTarget), true)}`}
                    />
                  )}
                  {currentMilestone.statesTarget && (
                    <ProgressBar
                      current={stcMetrics?.statesOperating || 0}
                      target={currentMilestone.statesTarget}
                      label={`States → ${currentMilestone.statesTarget}`}
                    />
                  )}
                </div>

                {currentMilestone.keyObjectives &&
                  Array.isArray(currentMilestone.keyObjectives) &&
                  currentMilestone.keyObjectives.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Key Objectives
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentMilestone.keyObjectives.map((obj, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <CheckCircleIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Primary Target: Stronger Youth Brands */}
        {acquirers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <BuildingOfficeIcon className="h-5 w-5 text-brand-purple" />
              <h2 className="text-lg font-semibold text-gray-900">
                Acquisition Target Profile
              </h2>
            </div>
            <div className="space-y-4">
              {acquirers.map((acquirer) => (
                <div
                  key={acquirer.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {acquirer.companyName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Data Year: {acquirer.dataYear}
                        {acquirer.dataSource && ` • Source: ${acquirer.dataSource}`}
                      </p>
                    </div>
                    {acquirer.fundingRaised && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(Number(acquirer.fundingRaised), true)}
                        </div>
                        <div className="text-xs text-gray-500">Funding Raised</div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Portfolio Brands</div>
                      <div className="font-medium">Soccer Shots, Little Kickers</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Franchisees</div>
                      <div className="font-medium">
                        {formatNumber(acquirer.franchiseeCount)}+
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Countries</div>
                      <div className="font-medium">30+</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Children Enrolled</div>
                      <div className="font-medium">
                        {formatNumber(acquirer.childrenEnrolled)}+
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Comparison Table */}
        {competitors.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Industry Comparison
              </h2>
              <p className="text-sm text-gray-500">
                How STC compares to youth enrichment franchise leaders
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      System Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg/Unit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Performer
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Royalty
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Year
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* STC Row - highlighted */}
                  <tr className="bg-brand-purple/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-8 bg-brand-purple rounded mr-3"></div>
                        <div>
                          <div className="font-bold text-brand-purple">
                            Acme Franchise
                          </div>
                          <div className="text-xs text-gray-500">Your Company</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {formatCurrency(stcMetrics?.systemWideRevenue || 0, true)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {stcMetrics?.activeFranchisees || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatCurrency(stcMetrics?.avgRevenuePerUnit || 0, true)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      10%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {new Date().getFullYear()}
                    </td>
                  </tr>
                  {/* Competitor Rows */}
                  {competitors.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {company.companyName}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                              company.isStale
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {company.dataYear}
                            </span>
                          </div>
                          {company.parentCompany && (
                            <div className="text-xs text-gray-500">
                              {company.parentCompany}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        {formatCurrency(
                          company.systemWideRevenue
                            ? Number(company.systemWideRevenue)
                            : null,
                          true
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {formatNumber(company.totalUnits || company.franchiseeCount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {formatCurrency(
                          company.avgRevenuePerUnit
                            ? Number(company.avgRevenuePerUnit)
                            : null,
                          true
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {formatCurrency(
                          company.topPerformerRevenue
                            ? Number(company.topPerformerRevenue)
                            : null,
                          true
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {company.royaltyRate ? `${company.royaltyRate}%` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        {company.dataYear}
                        {company.isStale && (
                          <ExclamationTriangleIcon className="inline h-4 w-4 ml-1 text-amber-500" title="Data may be outdated" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gap Analysis vs Soccer Shots */}
        {soccerShots && stcMetrics && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Gap Analysis: STC vs Soccer Shots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Revenue Gap</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    (Number(soccerShots.systemWideRevenue) || 0) -
                      (stcMetrics.systemWideRevenue || 0),
                    true
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  to match Soccer Shots system revenue
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Franchisee Gap</div>
                <div className="text-2xl font-bold text-red-600">
                  {(soccerShots.franchiseeCount || 0) -
                    (stcMetrics.activeFranchisees || 0)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  more franchisees needed
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">
                  Unit Economics Comparison
                </div>
                <div
                  className={`text-2xl font-bold ${
                    (stcMetrics.avgRevenuePerUnit || 0) >=
                    (Number(soccerShots.avgRevenuePerUnit) || 0)
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {(
                    ((stcMetrics.avgRevenuePerUnit || 0) /
                      (Number(soccerShots.avgRevenuePerUnit) || 1)) *
                    100
                  ).toFixed(0)}
                  %
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  of Soccer Shots avg/unit (
                  {formatCurrency(Number(soccerShots.avgRevenuePerUnit), true)})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {benchmarks.length === 0 && milestones.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Benchmark Data Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Add industry benchmarks and growth milestones to track your progress
              toward acquisition readiness.
            </p>
            <Link
              href="/admin/settings/benchmarks"
              className="inline-flex items-center px-4 py-2 bg-brand-purple text-white rounded-md hover:bg-brand-purple/90"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Set Up Benchmarks
            </Link>
          </div>
        )}

        {/* Instructions Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">
            📊 Keeping Benchmarks Updated
          </h3>
          <p className="text-sm text-blue-800 mb-2">
            Industry benchmark data comes from public FDD filings and press releases.
            To update:
          </p>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>
              Go to{" "}
              <Link
                href="/admin/settings/benchmarks"
                className="underline font-medium"
              >
                Settings → Benchmarks
              </Link>
            </li>
            <li>Add new data annually when FDDs are released (typically March-May)</li>
            <li>
              Key sources: FranchiseChatter.com, Franchise Times Top 400, company
              press releases
            </li>
          </ol>
        </div>
      </div>
    </WideContainer>
  );
}
