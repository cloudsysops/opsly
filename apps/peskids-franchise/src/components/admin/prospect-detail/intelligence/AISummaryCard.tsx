"use client";

import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";

interface AISummaryCardProps {
  summary: string;
  sentiment: string | null;
  engagementScore: number | null;
  generatedAt: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const sentimentColors: Record<string, { bg: string; text: string; label: string }> = {
  POSITIVE: { bg: "bg-green-100", text: "text-green-700", label: "Positive" },
  NEUTRAL: { bg: "bg-gray-100", text: "text-gray-600", label: "Neutral" },
  NEGATIVE: { bg: "bg-red-100", text: "text-red-700", label: "Negative" },
  MIXED: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Mixed" },
};

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "High Engagement";
  if (score >= 40) return "Moderate Engagement";
  return "Low Engagement";
}

export function AISummaryCard({
  summary,
  sentiment,
  engagementScore,
  generatedAt,
  onRefresh,
  isRefreshing,
}: AISummaryCardProps) {
  const sentimentStyle = sentiment
    ? sentimentColors[sentiment] || sentimentColors.NEUTRAL
    : sentimentColors.NEUTRAL;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-brand-purple"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-navy">AI Summary</h2>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Sentiment */}
          {sentiment && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sentiment:</span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sentimentStyle.bg} ${sentimentStyle.text}`}
              >
                {sentimentStyle.label}
              </span>
            </div>
          )}

          {/* Engagement Score */}
          {engagementScore !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Engagement:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      engagementScore >= 70
                        ? "bg-green-500"
                        : engagementScore >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${engagementScore}%` }}
                  />
                </div>
                <span className={`text-sm font-medium ${getScoreColor(engagementScore)}`}>
                  {engagementScore}
                </span>
              </div>
              <span className={`text-xs ${getScoreColor(engagementScore)}`}>
                ({getScoreLabel(engagementScore)})
              </span>
            </div>
          )}
        </div>

        {/* Summary Text */}
        <div className="prose prose-sm max-w-none">
          {summary.split("\n\n").map((paragraph, index) => (
            <p key={index} className="text-gray-700 mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t text-xs text-gray-400">
          Generated {formatDate(new Date(generatedAt))}
        </div>
      </CardContent>
    </Card>
  );
}
