"use client";

import { useState, useEffect } from "react";
import { AIEvaluationCard } from "../prework/AIEvaluationCard";
import { SubmissionReview } from "../prework/SubmissionReview";

interface PreWorkSubmission {
  id: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  score: number | null;
  module: {
    id: string;
    slug: string;
    title: string;
    sequence: number;
  };
}

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

interface PreWorkTabProps {
  prospectId: string;
  submissions: PreWorkSubmission[];
}

export function PreWorkTab({ prospectId, submissions }: PreWorkTabProps) {
  const [evaluation, setEvaluation] = useState<PreWorkEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing evaluation on mount
  useEffect(() => {
    async function fetchEvaluation() {
      try {
        const response = await fetch(`/api/admin/prospects/${prospectId}/evaluation`);
        const data = await response.json();
        if (data.success && data.evaluation) {
          setEvaluation(data.evaluation);
        }
      } catch (err) {
        console.error("Error fetching evaluation:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvaluation();
  }, [prospectId]);

  // Generate or refresh evaluation
  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/prospects/${prospectId}/evaluation`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate evaluation");
      }

      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  }

  const submittedCount = submissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
  ).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* AI Evaluation Card */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">
          Loading evaluation...
        </div>
      ) : (
        <>
          {/* Show evaluation if exists or if enough submissions to generate */}
          {(evaluation || submittedCount >= 1) && (
            <AIEvaluationCard
              prospectId={prospectId}
              evaluation={evaluation}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          )}

          {/* Message if no submissions */}
          {submittedCount === 0 && !evaluation && (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              <p className="font-medium mb-2">No pre-work submissions yet</p>
              <p className="text-sm">
                AI evaluation will be available after the prospect submits their pre-work modules.
              </p>
            </div>
          )}
        </>
      )}

      {/* Submission Review Section */}
      <SubmissionReview submissions={submissions} />
    </div>
  );
}
