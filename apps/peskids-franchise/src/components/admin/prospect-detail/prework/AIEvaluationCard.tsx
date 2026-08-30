"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";

interface PreWorkEvaluation {
  id: string;
  hustleScore: number;
  instructionScore: number;
  communicationScore: number;
  marketScore: number;
  coachabilityScore: number;
  valuesScore: number;
  readinessScore: number;
  compositeScore: number;
  confidenceLevel: string;
  greenFlags: string[];
  redFlags: string[];
  adminSummary: string;
  recommendation: string;
  outreachCredibility: string;
  planRealismAnalysis: string;
  systemSuggestions: {
    interviewQuestions: string[];
    coachingAreas: string[];
  } | null;
  generatedAt: Date;
}

interface AIEvaluationCardProps {
  prospectId: string;
  evaluation: PreWorkEvaluation | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const recommendationConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  STRONG_YES: {
    label: "Strong Yes",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  YES_WITH_COACHING: {
    label: "Yes (with coaching)",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  BORDERLINE: {
    label: "Borderline",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  NO: {
    label: "No",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

const credibilityConfig: Record<string, { label: string; color: string }> = {
  HIGH: { label: "High", color: "text-green-600" },
  MEDIUM: { label: "Medium", color: "text-yellow-600" },
  LOW: { label: "Low", color: "text-red-600" },
};

const confidenceConfig: Record<string, { label: string; color: string }> = {
  HIGH: { label: "High Confidence", color: "text-green-600" },
  MEDIUM: { label: "Medium Confidence", color: "text-yellow-600" },
  LOW: { label: "Low Confidence", color: "text-red-600" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function DimensionBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: string;
}) {
  const percentage = (score / 10) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">
          {label} <span className="text-gray-400 text-xs">({weight})</span>
        </span>
        <span className="font-medium">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getScoreBgColor(score * 10)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function AIEvaluationCard({
  prospectId,
  evaluation,
  onRefresh,
  isRefreshing,
}: AIEvaluationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!evaluation) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">
              AI Evaluation
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isRefreshing}
            >
              Generate Evaluation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No AI evaluation has been generated yet.
            <br />
            <span className="text-sm">
              Click &quot;Generate Evaluation&quot; to analyze the pre-work submissions.
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  const rec = recommendationConfig[evaluation.recommendation] || {
    label: evaluation.recommendation,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  };

  const cred = credibilityConfig[evaluation.outreachCredibility] || {
    label: evaluation.outreachCredibility,
    color: "text-gray-600",
  };

  const conf = confidenceConfig[evaluation.confidenceLevel] || {
    label: evaluation.confidenceLevel,
    color: "text-gray-600",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-navy">
            AI Evaluation
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Row: Score + Recommendation */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Composite Score */}
          <div className="flex flex-col items-center">
            <div
              className={`text-5xl font-bold ${getScoreColor(
                evaluation.compositeScore
              )}`}
            >
              {Math.round(evaluation.compositeScore)}
            </div>
            <div className="text-sm text-gray-500">Composite Score</div>
            <div className={`text-xs mt-1 ${conf.color}`}>{conf.label}</div>
          </div>

          {/* Recommendation Badge */}
          <div className="flex-1">
            <div
              className={`inline-block px-4 py-2 rounded-lg ${rec.bgColor} ${rec.color} font-semibold text-lg mb-3`}
            >
              {rec.label}
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-500">Outreach Credibility: </span>
                <span className={`font-medium ${cred.color}`}>{cred.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {evaluation.adminSummary}
          </p>
        </div>

        {/* Green/Red Flags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Green Flags */}
          <div>
            <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
              <span className="text-green-500">✓</span> Green Flags
            </h3>
            <div className="space-y-1">
              {(evaluation.greenFlags as string[]).map((flag, i) => (
                <div
                  key={i}
                  className="text-sm px-2 py-1 bg-green-50 text-green-700 rounded"
                >
                  {flag}
                </div>
              ))}
              {(evaluation.greenFlags as string[]).length === 0 && (
                <div className="text-sm text-gray-400 italic">None identified</div>
              )}
            </div>
          </div>

          {/* Red Flags */}
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
              <span className="text-red-500">!</span> Red Flags
            </h3>
            <div className="space-y-1">
              {(evaluation.redFlags as string[]).map((flag, i) => (
                <div
                  key={i}
                  className="text-sm px-2 py-1 bg-red-50 text-red-700 rounded"
                >
                  {flag}
                </div>
              ))}
              {(evaluation.redFlags as string[]).length === 0 && (
                <div className="text-sm text-gray-400 italic">None identified</div>
              )}
            </div>
          </div>
        </div>

        {/* Dimension Breakdown (Collapsible) */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-semibold text-gray-700">
              Score Breakdown
            </h3>
            <span className="text-gray-400">{showDetails ? "▲" : "▼"}</span>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-3">
              <DimensionBar
                label="Hustle"
                score={evaluation.hustleScore}
                weight="25%"
              />
              <DimensionBar
                label="Instruction Following"
                score={evaluation.instructionScore}
                weight="20%"
              />
              <DimensionBar
                label="Communication"
                score={evaluation.communicationScore}
                weight="15%"
              />
              <DimensionBar
                label="Market Understanding"
                score={evaluation.marketScore}
                weight="15%"
              />
              <DimensionBar
                label="Coachability"
                score={evaluation.coachabilityScore}
                weight="10%"
              />
              <DimensionBar
                label="Values Alignment"
                score={evaluation.valuesScore}
                weight="10%"
              />
              <DimensionBar
                label="Readiness"
                score={evaluation.readinessScore}
                weight="5%"
              />
            </div>
          )}
        </div>

        {/* Plan Realism Analysis */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            90-Day Plan Analysis
          </h3>
          <p className="text-sm text-gray-600">{evaluation.planRealismAnalysis}</p>
        </div>

        {/* System Suggestions (Collapsible) */}
        {evaluation.systemSuggestions && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-sm font-semibold text-gray-700">
                Interview & Coaching Suggestions
              </h3>
              <span className="text-gray-400">{showSuggestions ? "▲" : "▼"}</span>
            </button>

            {showSuggestions && (
              <div className="mt-4 space-y-4">
                {evaluation.systemSuggestions.interviewQuestions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Suggested Interview Questions
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.systemSuggestions.interviewQuestions.map(
                        (q, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                          >
                            {q}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {evaluation.systemSuggestions.coachingAreas?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Coaching Areas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.systemSuggestions.coachingAreas.map((area, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generated timestamp */}
        <div className="text-xs text-gray-400 text-right">
          Generated {new Date(evaluation.generatedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
