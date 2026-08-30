"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";

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

interface SubmissionReviewProps {
  submissions: PreWorkSubmission[];
  onScoreUpdate?: (submissionId: string, score: number) => void;
  onStatusUpdate?: (submissionId: string, status: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: "Draft", color: "text-gray-600", bgColor: "bg-gray-100" },
  SUBMITTED: { label: "Submitted", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  UNDER_REVIEW: { label: "Under Review", color: "text-blue-700", bgColor: "bg-blue-100" },
  APPROVED: { label: "Approved", color: "text-green-700", bgColor: "bg-green-100" },
  NEEDS_REVISION: { label: "Needs Revision", color: "text-red-700", bgColor: "bg-red-100" },
};

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function SubmissionCard({ submission }: { submission: PreWorkSubmission }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[submission.status] || statusConfig.DRAFT;
  const content = submission.content as Record<string, unknown>;

  // Filter out internal/hidden fields
  const displayFields = Object.entries(content).filter(
    ([key]) => !key.startsWith("_") && key !== "moduleId"
  );

  return (
    <Card>
      <CardHeader>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-brand-light text-brand-navy font-bold rounded-full text-sm">
              {submission.module.sequence}
            </div>
            <div>
              <h3 className="font-semibold text-brand-navy">
                {submission.module.title}
              </h3>
              <div className="text-sm text-gray-500">
                {submission.submittedAt
                  ? `Submitted ${formatDate(submission.submittedAt)}`
                  : "Not submitted"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {submission.score && (
              <div className="text-sm font-medium">
                Score: <span className="text-brand-navy">{submission.score}/10</span>
              </div>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}>
              {status.label}
            </span>
            <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t">
          <div className="space-y-4">
            {displayFields.map(([key, value]) => {
              // Handle outreach_entries specially (array of objects)
              if (key === "outreach_entries" && Array.isArray(value)) {
                return (
                  <div key={key} className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {formatFieldLabel(key)} ({value.length} entries)
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {value.map((entry, i) => (
                        <div
                          key={i}
                          className="p-3 bg-gray-50 rounded-lg text-sm border-l-2 border-brand-cyan"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div>
                              <span className="text-gray-500">School: </span>
                              <span className="font-medium">{entry.school_name || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Contact: </span>
                              <span className="font-medium">{entry.contact_name || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Title: </span>
                              <span className="font-medium">{entry.contact_title || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Date: </span>
                              <span className="font-medium">{entry.date || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Method: </span>
                              <span className={`font-medium capitalize ${
                                entry.method === "visit" ? "text-green-600" :
                                entry.method === "call" ? "text-blue-600" :
                                "text-gray-600"
                              }`}>{entry.method || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Outcome: </span>
                              <span className={`font-medium ${
                                entry.outcome === "conversation" ? "text-green-600" :
                                entry.outcome === "voicemail" ? "text-yellow-600" :
                                "text-gray-600"
                              }`}>{entry.outcome?.replace(/_/g, " ") || "—"}</span>
                            </div>
                          </div>
                          {entry.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <span className="text-gray-500">Notes: </span>
                              <span className="text-gray-700">{entry.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // Handle regular string/number values
              const displayValue = typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value || "—");

              // Check if it's a long text field
              const isLongText = typeof value === "string" && value.length > 200;
              const isMultiLine = typeof value === "string" && value.includes("\n");

              return (
                <div key={key} className="space-y-1">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {formatFieldLabel(key)}
                  </h4>
                  {isLongText || isMultiLine ? (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
                        {displayValue}
                      </pre>
                    </div>
                  ) : key.includes("url") || key.includes("video") ? (
                    <a
                      href={displayValue}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-purple hover:underline break-all"
                    >
                      {displayValue}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-600">{displayValue}</p>
                  )}
                </div>
              );
            })}

            {/* Review notes if any */}
            {submission.reviewNotes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                  Admin Review Notes
                </h4>
                <p className="text-sm text-yellow-700">{submission.reviewNotes}</p>
                {submission.reviewedBy && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Reviewed by {submission.reviewedBy}
                    {submission.reviewedAt && ` on ${formatDate(submission.reviewedAt)}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function SubmissionReview({ submissions }: SubmissionReviewProps) {
  // Sort by module sequence
  const sortedSubmissions = [...submissions].sort(
    (a, b) => a.module.sequence - b.module.sequence
  );

  const submittedCount = submissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-navy">
          Pre-Work Submissions
        </h2>
        <div className="text-sm text-gray-500">
          {submittedCount} of 5 modules submitted
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-green rounded-full transition-all"
          style={{ width: `${(submittedCount / 5) * 100}%` }}
        />
      </div>

      {/* Submission cards */}
      <div className="space-y-3">
        {sortedSubmissions.length > 0 ? (
          sortedSubmissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No pre-work submissions yet.
          </div>
        )}
      </div>
    </div>
  );
}
