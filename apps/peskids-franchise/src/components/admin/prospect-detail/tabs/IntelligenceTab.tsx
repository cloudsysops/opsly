"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { AISummaryCard } from "../intelligence/AISummaryCard";
import { KeyInsights } from "../intelligence/KeyInsights";

interface IntelligenceTabProps {
  prospectId: string;
  prospectName: string;
}

interface Summary {
  id: string;
  summary: string;
  keyInsights: string[];
  sentiment: string | null;
  engagementScore: number | null;
  generatedAt: string;
}

export function IntelligenceTab({ prospectId, prospectName }: IntelligenceTabProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}/summary`);
      const data = await response.json();

      if (response.ok && !data.needsGeneration) {
        setSummary(data);
      } else {
        // Need to generate
        setSummary(null);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError("Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  async function generateSummary() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}/summary`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error("Error generating summary:", err);
      setError("Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }

  async function refreshSummary() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}/summary`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh summary");
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error("Error refreshing summary:", err);
      setError("Failed to refresh summary");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading intelligence...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-brand-purple"
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
          </div>
          <h3 className="text-lg font-semibold text-brand-navy mb-2">
            AI Intelligence Not Generated
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Generate an AI-powered summary of {prospectName}'s engagement,
            key insights, and potential fit for the franchise.
          </p>
          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}
          <button
            onClick={generateSummary}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-navy transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Intelligence
              </>
            )}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <AISummaryCard
        summary={summary.summary}
        sentiment={summary.sentiment}
        engagementScore={summary.engagementScore}
        generatedAt={summary.generatedAt}
        onRefresh={refreshSummary}
        isRefreshing={generating}
      />

      {/* Key Insights */}
      <KeyInsights insights={summary.keyInsights} />

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
