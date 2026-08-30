"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PlayIcon,
  XMarkIcon,
  CalendarDaysIcon,
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
  response?: AuditResponse | null;
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
  franchisee: {
    id: string;
    name: string;
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

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Local response state for conducting mode
  const [localResponses, setLocalResponses] = useState<
    Record<string, { value: string; notes: string }>
  >({});

  // Corrective action modal
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({
    description: "",
    assignedTo: "",
    dueDate: "",
  });
  const [addingAction, setAddingAction] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, [auditId]);

  async function fetchAudit() {
    try {
      const res = await fetch(`/api/admin/operations/audits/${auditId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load audit");
        return;
      }
      setAudit(json.audit);

      // Initialize local responses from existing responses
      const responses: Record<string, { value: string; notes: string }> = {};
      if (json.audit.responses) {
        json.audit.responses.forEach((r: AuditResponse) => {
          responses[r.templateItemId] = {
            value: r.responseValue || "",
            notes: r.notes || "",
          };
        });
      }
      setLocalResponses(responses);
    } catch (err) {
      console.error("Error fetching audit:", err);
      setError("Failed to load audit");
    } finally {
      setLoading(false);
    }
  }

  const runningScore = useCallback(() => {
    if (!audit) return null;
    const items = audit.template.items;
    let totalWeight = 0;
    let weightedScore = 0;
    let hasAnyResponse = false;

    items.forEach((item) => {
      const resp = localResponses[item.id];
      if (resp && resp.value) {
        const score = calculateItemScore(item.itemType, resp.value);
        if (score !== null) {
          totalWeight += item.weight;
          weightedScore += score * item.weight;
          hasAnyResponse = true;
        }
      }
    });

    if (!hasAnyResponse || totalWeight === 0) return null;
    return weightedScore / totalWeight;
  }, [audit, localResponses]);

  function updateResponse(itemId: string, field: "value" | "notes", val: string) {
    setLocalResponses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: val,
        value: prev[itemId]?.value || "",
        notes: prev[itemId]?.notes || "",
      },
    }));
  }

  async function handleSaveProgress() {
    setSaving(true);
    setError(null);
    try {
      const responsesArray = Object.entries(localResponses).map(([templateItemId, data]) => ({
        templateItemId,
        responseValue: data.value || null,
        notes: data.notes || null,
      }));

      const res = await fetch(`/api/admin/operations/audits/${auditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responsesArray }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to save progress");
      }
    } catch (err) {
      console.error("Error saving progress:", err);
      setError("Failed to save progress");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    setError(null);
    try {
      const responsesArray = Object.entries(localResponses).map(([templateItemId, data]) => ({
        templateItemId,
        responseValue: data.value || null,
        notes: data.notes || null,
      }));

      const res = await fetch(`/api/admin/operations/audits/${auditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: responsesArray,
          status: "COMPLETED",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to complete audit");
        return;
      }

      await fetchAudit();
    } catch (err) {
      console.error("Error completing audit:", err);
      setError("Failed to complete audit");
    } finally {
      setCompleting(false);
    }
  }

  async function handleStartAudit() {
    try {
      const res = await fetch(`/api/admin/operations/audits/${auditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to start audit");
        return;
      }

      await fetchAudit();
    } catch (err) {
      console.error("Error starting audit:", err);
      setError("Failed to start audit");
    }
  }

  async function handleAddCorrectiveAction() {
    if (!newAction.description.trim()) return;
    setAddingAction(true);
    try {
      const res = await fetch(`/api/admin/operations/audits/${auditId}/corrective-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAction),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to add corrective action");
        return;
      }

      setNewAction({ description: "", assignedTo: "", dueDate: "" });
      setShowAddAction(false);
      await fetchAudit();
    } catch (err) {
      console.error("Error adding corrective action:", err);
      setError("Failed to add corrective action");
    } finally {
      setAddingAction(false);
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
          href="/admin/operations/audits"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Audits
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

  const isScheduled = audit.status === "SCHEDULED";
  const isConducting = audit.status === "IN_PROGRESS";
  const isCompleted = audit.status === "COMPLETED";
  const currentScore = isConducting ? runningScore() : audit.overallScore;

  return (
    <WideContainer className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/operations/audits"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Audits
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
          <p className="mt-1 text-gray-600">
            {audit.franchisee.name} &mdash; {formatDate(audit.scheduledDate)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                STATUS_COLORS[audit.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {audit.status.replace(/_/g, " ")}
            </span>
            <span className="text-sm text-gray-500">Auditor: {audit.auditorName}</span>
          </div>
        </div>

        {/* Score Display */}
        {currentScore !== null && (
          <div className="flex-shrink-0">
            <div
              className={`w-24 h-24 rounded-full border-4 ${getScoreRingColor(currentScore)} flex items-center justify-center`}
            >
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>
                  {Math.round(currentScore)}
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULED MODE */}
      {isScheduled && (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-blue-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Audit Scheduled</h2>
            <p className="text-gray-600 mb-6">
              This audit is scheduled for {formatDate(audit.scheduledDate)}.
              {audit.notes && <span className="block mt-2 text-sm italic">{audit.notes}</span>}
            </p>
            <button
              onClick={handleStartAudit}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <PlayIcon className="h-5 w-5" />
              Start Audit
            </button>
          </CardContent>
        </Card>
      )}

      {/* CONDUCTING MODE */}
      {isConducting && (
        <>
          <div className="space-y-4">
            {audit.template.items
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item, index) => {
                const resp = localResponses[item.id];
                return (
                  <Card key={item.id}>
                    <CardContent className="py-5">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {item.question}
                            {item.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Weight: {item.weight}x
                          </div>
                        </div>
                      </div>

                      {/* PASS_FAIL */}
                      {item.itemType === "PASS_FAIL" && (
                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => updateResponse(item.id, "value", "PASS")}
                            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                              resp?.value === "PASS"
                                ? "bg-green-600 text-white"
                                : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                            }`}
                          >
                            <CheckCircleIcon className="h-5 w-5 inline-block mr-1" />
                            Pass
                          </button>
                          <button
                            onClick={() => updateResponse(item.id, "value", "FAIL")}
                            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                              resp?.value === "FAIL"
                                ? "bg-red-600 text-white"
                                : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                            }`}
                          >
                            <XCircleIcon className="h-5 w-5 inline-block mr-1" />
                            Fail
                          </button>
                        </div>
                      )}

                      {/* YES_NO */}
                      {item.itemType === "YES_NO" && (
                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => updateResponse(item.id, "value", "YES")}
                            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                              resp?.value === "YES"
                                ? "bg-green-600 text-white"
                                : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => updateResponse(item.id, "value", "NO")}
                            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                              resp?.value === "NO"
                                ? "bg-red-600 text-white"
                                : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      )}

                      {/* RATING_1_5 */}
                      {item.itemType === "RATING_1_5" && (
                        <div className="flex gap-2 mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => updateResponse(item.id, "value", star.toString())}
                              className="p-1 transition-colors"
                            >
                              {parseInt(resp?.value || "0") >= star ? (
                                <StarIconSolid className="h-8 w-8 text-amber-400" />
                              ) : (
                                <StarIcon className="h-8 w-8 text-gray-300 hover:text-amber-300" />
                              )}
                            </button>
                          ))}
                          {resp?.value && (
                            <span className="ml-2 self-center text-sm text-gray-500">
                              {resp.value}/5
                            </span>
                          )}
                        </div>
                      )}

                      {/* TEXT */}
                      {item.itemType === "TEXT" && (
                        <div className="mb-4">
                          <textarea
                            value={resp?.value || ""}
                            onChange={(e) => updateResponse(item.id, "value", e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter your response..."
                          />
                        </div>
                      )}

                      {/* PHOTO */}
                      {item.itemType === "PHOTO" && (
                        <div className="mb-4">
                          <input
                            type="text"
                            value={resp?.value || ""}
                            onChange={(e) => updateResponse(item.id, "value", e.target.value)}
                            className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter photo URL..."
                          />
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <ChatBubbleLeftIcon className="h-3 w-3" />
                          Notes
                        </label>
                        <textarea
                          value={resp?.notes || ""}
                          onChange={(e) => updateResponse(item.id, "notes", e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                          placeholder="Optional notes for this item..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-4 z-10">
            <Card className="shadow-lg">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 text-sm text-gray-600">
                    {currentScore !== null ? (
                      <span>
                        Running score:{" "}
                        <span className={`font-bold ${getScoreColor(currentScore)}`}>
                          {Math.round(currentScore)}%
                        </span>
                      </span>
                    ) : (
                      <span>No responses yet</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProgress}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Progress"}
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {completing ? "Completing..." : "Complete Audit"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* COMPLETED MODE */}
      {isCompleted && (
        <>
          {/* Items with responses */}
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
                        </div>
                        <div className="flex items-center gap-3">
                          {response?.responseValue && (
                            <span className="text-sm font-medium text-gray-700">
                              {item.itemType === "RATING_1_5"
                                ? `${response.responseValue}/5`
                                : response.responseValue}
                            </span>
                          )}
                          {score !== null && (
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
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
                      {response?.notes && (
                        <div className="ml-10 mt-2 text-sm text-gray-500 italic bg-gray-50 p-2 rounded">
                          {response.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Corrective Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                  Corrective Actions
                  {audit.correctiveActions.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                      {audit.correctiveActions.length}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowAddAction(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Action
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {audit.correctiveActions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No corrective actions have been created for this audit.
                </p>
              ) : (
                <div className="space-y-3">
                  {audit.correctiveActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{action.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            {action.assignedTo && (
                              <span>Assigned to: {action.assignedTo}</span>
                            )}
                            {action.dueDate && (
                              <span>Due: {formatDate(action.dueDate)}</span>
                            )}
                            <span>Created: {formatDate(action.createdAt)}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            CA_STATUS_COLORS[action.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {action.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {action.evidenceUrl && (
                        <div className="mt-2 text-xs">
                          <a
                            href={action.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            View Evidence
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Corrective Action Modal */}
      {showAddAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowAddAction(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Corrective Action</h3>
              <button
                onClick={() => setShowAddAction(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newAction.description}
                  onChange={(e) =>
                    setNewAction({ ...newAction, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe what needs to be corrected..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={newAction.assignedTo}
                  onChange={(e) =>
                    setNewAction({ ...newAction, assignedTo: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Name of responsible person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newAction.dueDate}
                  onChange={(e) =>
                    setNewAction({ ...newAction, dueDate: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddAction(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCorrectiveAction}
                disabled={addingAction || !newAction.description.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingAction ? "Adding..." : "Add Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
