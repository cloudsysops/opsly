"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface AuditResponse {
  id: string;
  templateItemId: string;
  responseValue: string | null;
  score: number | null;
  notes: string | null;
}

interface TemplateItem {
  id: string;
  question: string;
  description: string | null;
  itemType: string;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

interface CorrectiveAction {
  id: string;
  description: string;
  assignedTo: string | null;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  evidenceUrl: string | null;
  createdAt: string;
}

interface AuditDetail {
  id: string;
  scheduledDate: string;
  completedAt: string | null;
  status: string;
  overallScore: number | null;
  auditorName: string;
  auditorEmail: string;
  notes: string | null;
  template: {
    id: string;
    name: string;
    category: string;
    items: TemplateItem[];
  };
  responses: AuditResponse[];
  correctiveActions: CorrectiveAction[];
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const CA_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  VERIFIED: "bg-blue-100 text-blue-800",
};

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score > 80) return "text-green-600";
  if (score > 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreRingColor(score: number | null): string {
  if (score === null) return "border-gray-200";
  if (score > 80) return "border-green-500";
  if (score > 60) return "border-amber-500";
  return "border-red-500";
}

function calculateItemScore(itemType: string, responseValue: string | null): number | null {
  if (responseValue === null || responseValue === "") return null;
  switch (itemType) {
    case "PASS_FAIL":
      return responseValue === "PASS" ? 100 : 0;
    case "YES_NO":
      return responseValue === "YES" ? 100 : 0;
    case "RATING_1_5":
      return (parseInt(responseValue) / 5) * 100;
    case "TEXT":
    case "PHOTO":
      return 100;
    default:
      return null;
  }
}

export default function FranchiseeAuditDetailPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mark complete state
  const [completingActionId, setCompletingActionId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [markingComplete, setMarkingComplete] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, [auditId]);

  async function fetchAudit() {
    try {
      const res = await fetch(`/api/franchisee/operations/audits/${auditId}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to load audit");
        return;
      }

      setAudit(json.audit);
    } catch (err) {
      console.error("Error fetching audit:", err);
      setError("Failed to load audit details");
    } finally {
      setLoading(false);
    }
  }

  function openCompleteModal(actionId: string) {
    setCompletingActionId(actionId);
    setEvidenceUrl("");
    setShowCompleteModal(true);
  }

  async function handleMarkComplete() {
    if (!completingActionId) return;
    setMarkingComplete(true);

    try {
      const res = await fetch(
        `/api/franchisee/operations/audits/${auditId}/corrective-actions/${completingActionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            evidenceUrl: evidenceUrl || null,
          }),
        }
      );

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to update action");
        return;
      }

      setShowCompleteModal(false);
      setCompletingActionId(null);
      setEvidenceUrl("");
      await fetchAudit();
    } catch (err) {
      console.error("Error marking complete:", err);
      setError("Failed to update corrective action");
    } finally {
      setMarkingComplete(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </WideContainer>
    );
  }

  if (error && !audit) {
    return (
      <WideContainer className="space-y-6">
        <Link
          href="/portal/audits"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Audit Reports
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </WideContainer>
    );
  }

  if (!audit) return null;

  return (
    <WideContainer className="space-y-6">
      {/* Back Link */}
      <Link
        href="/portal/audits"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Audit Reports
      </Link>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
            {audit.template.name}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>
              {audit.completedAt
                ? formatDate(audit.completedAt)
                : formatDate(audit.scheduledDate)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Auditor: {audit.auditorName}</p>
          <span
            className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
              STATUS_COLORS[audit.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {audit.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Overall Score */}
        {audit.overallScore !== null && (
          <div className="flex-shrink-0">
            <div
              className={`w-24 h-24 rounded-full border-4 ${getScoreRingColor(audit.overallScore)} flex items-center justify-center`}
            >
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(audit.overallScore)}`}>
                  {Math.round(audit.overallScore)}
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Items */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Audit Items</h2>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100">
          {audit.template.items
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item, index) => {
              const response = audit.responses.find(
                (r) => r.templateItemId === item.id
              );
              const score = response
                ? calculateItemScore(item.itemType, response.responseValue)
                : null;

              return (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{item.question}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}

                      {/* Response display */}
                      {response?.responseValue && (
                        <div className="mt-2">
                          {item.itemType === "RATING_1_5" && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) =>
                                parseInt(response.responseValue || "0") >= star ? (
                                  <StarIconSolid key={star} className="h-5 w-5 text-amber-400" />
                                ) : (
                                  <StarIcon key={star} className="h-5 w-5 text-gray-300" />
                                )
                              )}
                              <span className="ml-1 text-sm text-gray-500">
                                ({response.responseValue}/5)
                              </span>
                            </div>
                          )}
                          {(item.itemType === "PASS_FAIL" || item.itemType === "YES_NO") && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                response.responseValue === "PASS" || response.responseValue === "YES"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {response.responseValue === "PASS" || response.responseValue === "YES" ? (
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                              ) : (
                                <XMarkIcon className="h-3.5 w-3.5" />
                              )}
                              {response.responseValue}
                            </span>
                          )}
                          {(item.itemType === "TEXT" || item.itemType === "PHOTO") && (
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">
                              {response.responseValue}
                            </p>
                          )}
                        </div>
                      )}

                      {response?.notes && (
                        <p className="text-sm text-gray-500 italic mt-2 bg-gray-50 p-2 rounded">
                          {response.notes}
                        </p>
                      )}
                    </div>

                    {/* Score badge */}
                    {score !== null && (
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          score > 80
                            ? "bg-green-100 text-green-700"
                            : score > 60
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {Math.round(score)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Corrective Actions */}
      {audit.correctiveActions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              Corrective Actions
              <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                {audit.correctiveActions.length}
              </span>
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {audit.correctiveActions.map((action) => (
              <div
                key={action.id}
                className="p-4 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {action.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          Due: {formatDate(action.dueDate)}
                        </span>
                      )}
                      {action.assignedTo && (
                        <span>Assigned to: {action.assignedTo}</span>
                      )}
                    </div>
                    {action.evidenceUrl && (
                      <div className="mt-2">
                        <a
                          href={action.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          View Evidence
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        CA_STATUS_COLORS[action.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {action.status.replace(/_/g, " ")}
                    </span>

                    {(action.status === "OPEN" || action.status === "IN_PROGRESS") && (
                      <button
                        onClick={() => openCompleteModal(action.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mark Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowCompleteModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Mark as Complete</h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a link to evidence of the corrective action being completed (optional).
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence URL
                </label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={markingComplete}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingComplete ? "Saving..." : "Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
