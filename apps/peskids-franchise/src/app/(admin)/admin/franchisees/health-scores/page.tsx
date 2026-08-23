"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import {
  HeartIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ChevronDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface HealthScoreData {
  id: string;
  franchiseeAccountId: string;
  franchiseeName: string;
  franchiseeEmail: string;
  year: number;
  month: number;
  financialScore: number;
  operationalScore: number;
  complianceScore: number;
  engagementScore: number;
  growthScore: number;
  compositeScore: number;
  riskLevel: string;
  trend: string;
  previousScore: number | null;
  riskFactors: { factor: string; impact: string; description: string }[];
  recommendations: { priority: string; category: string; action: string }[];
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
  MODERATE: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  ELEVATED: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  CRITICAL: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
};

const riskLabels: Record<string, string> = {
  LOW: "Low Risk",
  MODERATE: "Moderate",
  ELEVATED: "Elevated",
  HIGH: "High Risk",
  CRITICAL: "Critical",
};

export default function HealthScoresPage() {
  const [scores, setScores] = useState<HealthScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<HealthScoreData | null>(null);

  useEffect(() => {
    fetchHealthScores();
  }, [selectedYear, selectedMonth]);

  const fetchHealthScores = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/health-scores?year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await res.json();
      setScores(data.scores || []);
    } catch (error) {
      console.error("Failed to fetch health scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = scores.filter((s) => {
    if (riskFilter === "all") return true;
    return s.riskLevel === riskFilter;
  });

  // Summary stats
  const criticalCount = scores.filter((s) => s.riskLevel === "CRITICAL").length;
  const highRiskCount = scores.filter((s) => s.riskLevel === "HIGH").length;
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b.compositeScore, 0) / scores.length
    : 0;
  const improvingCount = scores.filter((s) => s.trend === "IMPROVING").length;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "IMPROVING":
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "DECLINING":
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 55) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 55) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) {
    return (
      <WideContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Franchisee Health Scores</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor franchisee performance and identify at-risk locations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical/High Risk</p>
                <p className="text-2xl font-bold text-gray-900">
                  {criticalCount + highRiskCount}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Network Avg Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                  {avgScore.toFixed(0)}
                </p>
              </div>
              <HeartIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Improving</p>
                <p className="text-2xl font-bold text-gray-900">{improvingCount}</p>
              </div>
              <ArrowTrendingUpIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Franchisees</p>
                <p className="text-2xl font-bold text-gray-900">{scores.length}</p>
              </div>
              <HeartIcon className="h-10 w-10 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Risk:</label>
            <div className="flex gap-2">
              {["all", "CRITICAL", "HIGH", "ELEVATED", "MODERATE", "LOW"].map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    riskFilter === level
                      ? "bg-brand-purple text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {level === "all" ? "All" : riskLabels[level]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Health Scores Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overall Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operational
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 font-medium">No health scores available</p>
                    <p className="text-sm">
                      Health scores are calculated when revenue data is synced.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredScores.map((score) => (
                  <tr
                    key={score.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedScore(score)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/franchisees/${score.franchiseeAccountId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-gray-900 hover:text-brand-purple"
                      >
                        {score.franchiseeName}
                      </Link>
                      <p className="text-sm text-gray-500">{score.franchiseeEmail}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${getScoreColor(score.compositeScore)}`}>
                          {score.compositeScore.toFixed(0)}
                        </span>
                        <div className="flex-1 max-w-[60px] h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreBarColor(score.compositeScore)}`}
                            style={{ width: `${score.compositeScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          riskColors[score.riskLevel]?.bg
                        } ${riskColors[score.riskLevel]?.text}`}
                      >
                        {riskLabels[score.riskLevel]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getScoreColor(score.financialScore)}>
                        {score.financialScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getScoreColor(score.operationalScore)}>
                        {score.operationalScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getScoreColor(score.complianceScore)}>
                        {score.complianceScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(score.trend)}
                        {score.previousScore !== null && (
                          <span
                            className={`text-xs ${
                              score.compositeScore > score.previousScore
                                ? "text-green-600"
                                : score.compositeScore < score.previousScore
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {score.compositeScore > score.previousScore
                              ? `+${(score.compositeScore - score.previousScore).toFixed(0)}`
                              : (score.compositeScore - score.previousScore).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScore(score);
                        }}
                        className="text-brand-purple hover:text-brand-purple/80 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedScore && (
        <HealthScoreDetailModal
          score={selectedScore}
          onClose={() => setSelectedScore(null)}
        />
      )}
    </WideContainer>
  );
}

interface HealthScoreDetailModalProps {
  score: HealthScoreData;
  onClose: () => void;
}

function HealthScoreDetailModal({ score, onClose }: HealthScoreDetailModalProps) {
  const getScoreColor = (value: number) => {
    if (value >= 85) return "text-green-600";
    if (value >= 70) return "text-blue-600";
    if (value >= 55) return "text-yellow-600";
    if (value >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBarColor = (value: number) => {
    if (value >= 85) return "bg-green-500";
    if (value >= 70) return "bg-blue-500";
    if (value >= 55) return "bg-yellow-500";
    if (value >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const categories = [
    { label: "Financial", value: score.financialScore, weight: "30%" },
    { label: "Operational", value: score.operationalScore, weight: "25%" },
    { label: "Compliance", value: score.complianceScore, weight: "20%" },
    { label: "Engagement", value: score.engagementScore, weight: "15%" },
    { label: "Growth", value: score.growthScore, weight: "10%" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{score.franchiseeName}</h3>
              <p className="text-sm text-gray-500">Health Score Details</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Overall Score */}
            <div className="text-center">
              <p className={`text-5xl font-bold ${getScoreColor(score.compositeScore)}`}>
                {score.compositeScore.toFixed(0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Overall Health Score</p>
              <span
                className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  riskColors[score.riskLevel]?.bg
                } ${riskColors[score.riskLevel]?.text}`}
              >
                {riskLabels[score.riskLevel]}
              </span>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Score Breakdown</h4>
              {categories.map((cat) => (
                <div key={cat.label} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">{cat.label}</div>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getScoreBarColor(cat.value)}`}
                      style={{ width: `${cat.value}%` }}
                    />
                  </div>
                  <div className={`w-12 text-right font-medium ${getScoreColor(cat.value)}`}>
                    {cat.value.toFixed(0)}
                  </div>
                  <div className="w-12 text-right text-xs text-gray-400">{cat.weight}</div>
                </div>
              ))}
            </div>

            {/* Risk Factors */}
            {score.riskFactors && score.riskFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Factors</h4>
                <div className="space-y-2">
                  {score.riskFactors.map((factor, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        factor.impact === "HIGH"
                          ? "bg-red-50 border-red-200"
                          : factor.impact === "MEDIUM"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p className="font-medium text-sm">{factor.factor}</p>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {score.recommendations && score.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {score.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          rec.priority === "HIGH"
                            ? "bg-red-100 text-red-800"
                            : rec.priority === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-sm text-gray-700">{rec.action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                href={`/admin/franchisees/${score.franchiseeAccountId}`}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90"
              >
                View Franchisee Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
